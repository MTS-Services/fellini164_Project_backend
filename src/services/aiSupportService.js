const OpenAI = require('openai');
const prisma = require('../config/database');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SUPPORT_ASSISTANT_ID = process.env.OPENAI_SUPPORT_ASSISTANT_ID;

class AISupportService {

  async getOrCreateAssistant() {
    try {

      if (SUPPORT_ASSISTANT_ID) {
        try {
          const assistant = await openai.beta.assistants.retrieve(SUPPORT_ASSISTANT_ID);
          return assistant;
        } catch (error) {
          console.log('Assistant not found, creating new one...');
        }
      }


      const assistant = await openai.beta.assistants.create({
        name: "Fellini Support Assistant",
        instructions: `You are a helpful and friendly customer support assistant for Fellini, an AI-powered life planning and productivity platform.

Your role is to help users with:
- Questions about features and how to use the platform
- Subscription plans (Free, Starter, Pro, Ultimate)
- Billing and payment issues
- Account management
- Troubleshooting common problems
- Dashboard navigation
- AI features and capabilities

Key Platform Information:
- Fellini helps users plan their daily, weekly, and monthly goals using AI
- Features: AI Life Coach, Habit Tracker, Task Manager, Goal Setting, Progress Analysis
- Plans: Free (limited), Starter ($7.99/mo), Pro ($17.99/mo), Ultimate ($39.99/mo)
- Payments via Stripe (credit card, Apple Pay, Google Pay) and PayPal
- AI generates personalized plans based on user goals and preferences

Guidelines:
- Be friendly, professional, and concise
- Provide step-by-step instructions when needed
- If you don't know the answer, be honest and offer to escalate to human support
- Always prioritize user satisfaction
- Use emojis sparingly (only when appropriate)
- For billing/refund issues, escalate to human support
- For technical bugs, escalate to human support
- Keep responses under 200 words unless detailed explanation needed

When users express frustration or mention refunds/cancellation, acknowledge their concerns and offer to connect them with human support.`,
        model: "gpt-4-turbo-preview",
        tools: [{ type: "file_search" }]
      });

      console.log('✅ New Support Assistant created:', assistant.id);
      console.log('⚠️  Add this to your .env file: OPENAI_SUPPORT_ASSISTANT_ID=' + assistant.id);

      return assistant;
    } catch (error) {
      console.error('Error creating/retrieving assistant:', error);
      throw error;
    }
  }


  async uploadKnowledgeBase(filePaths) {
    try {
      const fileIds = [];

      for (const filePath of filePaths) {
        const file = await openai.files.create({
          file: require('fs').createReadStream(filePath),
          purpose: 'assistants'
        });
        fileIds.push(file.id);
      }

      // Update assistant with file IDs
      if (SUPPORT_ASSISTANT_ID) {
        await openai.beta.assistants.update(SUPPORT_ASSISTANT_ID, {
          file_ids: fileIds
        });
      }

      return fileIds;
    } catch (error) {
      console.error('Error uploading knowledge base:', error);
      throw error;
    }
  }


  async startConversation(userId, sessionId, initialMessage, userContext = {}) {
    try {
      // Ensure assistant exists
      const assistant = await this.getOrCreateAssistant();
      const assistantId = assistant.id;

      const thread = await openai.beta.threads.create();

      const conversation = await prisma.supportConversation.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          threadId: thread.id,
          assistantId: assistantId,
          subject: initialMessage.substring(0, 100),
          category: this.detectCategory(initialMessage),
          isAiHandled: true,
          messages: {
            create: {
              role: 'user',
              isFromUser: true,
              isFromAi: false,
              message: initialMessage
            }
          }
        },
        include: {
          messages: true
        }
      });


      const aiResponse = await this.getAIResponse(
        conversation.threadId,
        initialMessage,
        userContext,
        assistantId
      );

      // Save AI response
      await prisma.supportMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          isFromUser: false,
          isFromAi: true,
          message: aiResponse.message,
          confidence: aiResponse.confidence,
          tokensUsed: aiResponse.tokensUsed,
          responseTimeMs: aiResponse.responseTimeMs
        }
      });

      return {
        conversationId: conversation.id,
        message: aiResponse.message,
        shouldEscalate: aiResponse.shouldEscalate
      };
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }


  async continueConversation(conversationId, userMessage, userContext = {}) {
    try {
      const startTime = Date.now();

      // Get existing conversation
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
        include: { messages: true }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }


      const assistant = await this.getOrCreateAssistant();
      const assistantId = assistant.id;

      await prisma.supportMessage.create({
        data: {
          conversationId,
          role: 'user',
          isFromUser: true,
          isFromAi: false,
          message: userMessage
        }
      });


      const aiResponse = await this.getAIResponse(
        conversation.threadId,
        userMessage,
        userContext,
        assistantId
      );


      await prisma.supportMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          isFromUser: false,
          isFromAi: true,
          message: aiResponse.message,
          confidence: aiResponse.confidence,
          tokensUsed: aiResponse.tokensUsed,
          responseTimeMs: Date.now() - startTime
        }
      });

      // Check if escalation is needed
      if (aiResponse.shouldEscalate && !conversation.escalated) {
        await prisma.supportConversation.update({
          where: { id: conversationId },
          data: {
            needsHumanSupport: true,
            escalated: true,
            escalatedAt: new Date()
          }
        });
      }

      return {
        conversationId,
        message: aiResponse.message,
        shouldEscalate: aiResponse.shouldEscalate
      };
    } catch (error) {
      console.error('Error continuing conversation:', error);
      throw error;
    }
  }

  async getAIResponse(threadId, message, userContext = {}, assistantId = null) {
    try {
      const startTime = Date.now();

      // Use provided assistantId or get/create one
      const finalAssistantId = assistantId || (await this.getOrCreateAssistant()).id;


      let contextualMessage = message;
      if (Object.keys(userContext).length > 0) {
        contextualMessage = `User Context: ${JSON.stringify(userContext)}\n\nUser Question: ${message}`;
      }


      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: contextualMessage
      });


      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: finalAssistantId
      });


      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }


      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      const responseText = lastMessage.content[0].text.value;

      const responseTimeMs = Date.now() - startTime;

      // Detect if escalation is needed
      const shouldEscalate = this.shouldEscalateToHuman(message, responseText);

      return {
        message: responseText,
        confidence: shouldEscalate ? 0.5 : 0.9,
        tokensUsed: runStatus.usage?.total_tokens || 0,
        responseTimeMs,
        shouldEscalate
      };
    } catch (error) {
      console.error('Error getting AI response:', error);


      return {
        message: "I apologize, but I'm having trouble processing your request right now. Let me connect you with our human support team who can better assist you.",
        confidence: 0,
        tokensUsed: 0,
        responseTimeMs: 0,
        shouldEscalate: true
      };
    }
  }

  detectCategory(message) {
    const messageLower = message.toLowerCase();

    if (messageLower.match(/payment|billing|subscription|refund|cancel|charge|credit card|paypal/i)) {
      return 'billing';
    }
    if (messageLower.match(/login|password|sign up|verify|email|account/i)) {
      return 'account';
    }
    if (messageLower.match(/how to|how do i|tutorial|guide|help me/i)) {
      return 'how-to';
    }
    if (messageLower.match(/bug|error|not working|broken|issue|problem/i)) {
      return 'troubleshooting';
    }
    if (messageLower.match(/feature|plan|upgrade|dashboard|ai|habit|task/i)) {
      return 'features';
    }

    return 'general';
  }

  shouldEscalateToHuman(userMessage, aiResponse) {
    const messageLower = userMessage.toLowerCase();


    const escalationKeywords = [
      'refund',
      'speak to human',
      'talk to person',
      'real person',
      'manager',
      'supervisor',
      'frustrated',
      'angry',
      'unacceptable',
      'lawsuit',
      'lawyer',
      'complaint',
      'billing error',
      'charged wrong',
      'unauthorized charge'
    ];

    // Check for escalation keywords
    for (const keyword of escalationKeywords) {
      if (messageLower.includes(keyword)) {
        return true;
      }
    }


    if (aiResponse.toLowerCase().includes('connect you with') ||
      aiResponse.toLowerCase().includes('human support')) {
      return true;
    }

    return false;
  }


  async escalateToHuman(conversationId, reason) {
    try {
      await prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          needsHumanSupport: true,
          escalated: true,
          escalatedAt: new Date(),
          status: 'IN_PROGRESS'
        }
      });


      await prisma.supportMessage.create({
        data: {
          conversationId,
          role: 'system',
          isFromUser: false,
          isFromAi: false,
          message: `Conversation escalated to human support. Reason: ${reason}`,
          metadata: { reason }
        }
      });


      return {
        success: true,
        message: 'Your conversation has been escalated to our human support team. Someone will get back to you shortly.'
      };
    } catch (error) {
      console.error('Error escalating conversation:', error);
      throw error;
    }
  }


  async resolveConversation(conversationId, satisfactionRating = null, wasHelpful = null) {
    try {
      await prisma.supportConversation.update({
        where: { id: conversationId },
        data: {
          resolved: true,
          status: 'RESOLVED',
          resolvedAt: new Date(),
          userSatisfactionRating: satisfactionRating,
          wasHelpful
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error resolving conversation:', error);
      throw error;
    }
  }


  async getConversationHistory(conversationId) {
    try {
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              subscriptionPlan: true
            }
          }
        }
      });

      return conversation;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }


  async getUserConversations(userId, filters = {}) {
    try {
      const where = { userId };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.category) {
        where.category = filters.category;
      }

      const conversations = await prisma.supportConversation.findMany({
        where,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }


  async searchKnowledgeBase(query, category = null) {
    try {
      const where = { isActive: true };

      if (category) {
        where.category = category;
      }

      const results = await prisma.supportKnowledgeBase.findMany({
        where: {
          ...where,
          OR: [
            { question: { contains: query, mode: 'insensitive' } },
            { answer: { contains: query, mode: 'insensitive' } },
            { keywords: { has: query.toLowerCase() } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { helpfulCount: 'desc' }
        ],
        take: 10
      });

      return results;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      throw error;
    }
  }


  async getAnalytics(startDate, endDate) {
    try {
      const conversations = await prisma.supportConversation.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalConversations = conversations.length;
      const aiHandled = conversations.filter(c => c.isAiHandled).length;
      const escalated = conversations.filter(c => c.escalated).length;
      const resolved = conversations.filter(c => c.resolved).length;

      const satisfactionRatings = conversations
        .filter(c => c.userSatisfactionRating)
        .map(c => c.userSatisfactionRating);

      const avgSatisfaction = satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length
        : null;

      return {
        totalConversations,
        aiHandledConversations: aiHandled,
        escalatedConversations: escalated,
        resolvedConversations: resolved,
        escalationRate: totalConversations > 0 ? (escalated / totalConversations * 100).toFixed(2) : 0,
        resolutionRate: totalConversations > 0 ? (resolved / totalConversations * 100).toFixed(2) : 0,
        averageSatisfactionScore: avgSatisfaction ? avgSatisfaction.toFixed(2) : null
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
}

module.exports = new AISupportService();
