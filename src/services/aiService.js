const OpenAI = require('openai');
const prisma = require('../config/database');

class AIService {
  constructor() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  // Chat with AI
  async chat(userId, message, conversationId = null) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        goals: { where: { status: 'ACTIVE' } }
      }
    });

    // Get conversation history
    const conversationHistory = conversationId
      ? await prisma.aiChatLog.findMany({
        where: { userId, conversationId },
        orderBy: { createdAt: 'asc' },
        take: 10
      })
      : [];

    // Build messages
    const messages = [
      {
        role: 'system',
        content: this._getSystemPrompt(user)
      },
      ...conversationHistory.map(log => ({
        role: log.role.toLowerCase(),
        content: log.message
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiMessage = response.choices[0].message.content;
    const newConversationId = conversationId || this._generateConversationId();

    // Save chat logs
    await prisma.aiChatLog.createMany({
      data: [
        {
          userId,
          role: 'USER',
          message,
          conversationId: newConversationId,
          messageType: 'chat'
        },
        {
          userId,
          role: 'ASSISTANT',
          message: aiMessage,
          conversationId: newConversationId,
          messageType: 'chat',
          tokensUsed: response.usage.total_tokens
        }
      ]
    });

    return {
      message: aiMessage,
      conversationId: newConversationId,
      tokensUsed: response.usage.total_tokens
    };
  }

  // Generate daily plan
  async generateDailyPlan(userId, date = new Date()) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user data
    const [user, goals, habits, tasks] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true }
      }),
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' }
      }),
      prisma.habit.findMany({
        where: { userId, isActive: true }
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: { in: ['TODO', 'IN_PROGRESS'] }
        },
        orderBy: { priority: 'desc' },
        take: 10
      })
    ]);

    const prompt = this._buildDailyPlanPrompt(user, goals, habits, tasks, date);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert life coach and productivity planner.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const planContent = response.choices[0].message.content;

    // Save plan
    const plan = await prisma.dailyPlan.create({
      data: {
        userId,
        date: new Date(date),
        title: `Daily Plan - ${new Date(date).toLocaleDateString()}`,
        content: planContent,
        aiGenerated: true,
        status: 'ACTIVE'
      }
    });

    return plan;
  }

  // Generate recommendations
  async generateRecommendations(userId) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Analyze user data
    const [goals, habits, tasks, plans] = await Promise.all([
      prisma.goal.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.dailyPlan.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7
      })
    ]);

    const prompt = this._buildRecommendationPrompt(goals, habits, tasks, plans);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert life coach providing personalized recommendations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 800
    });

    return response.choices[0].message.content;
  }


  _getSystemPrompt(user) {
    const tone = user.settings?.aiTone || 'friendly';

    const tones = {
      strict: 'You are a strict, disciplined coach who pushes users to their limits.',
      friendly: 'You are a friendly, supportive mentor who encourages users warmly.',
      therapist: 'You are a compassionate therapist who listens deeply and guides gently.',
      coach: 'You are a professional life coach focused on actionable goals.',
      productivity: 'You are a productivity expert focused on efficiency and time management.'
    };

    return `${tones[tone] || tones.friendly} 
    User's goals: ${user.goals?.map(g => g.title).join(', ') || 'None set yet'}
    Respond in a helpful, concise manner.`;
  }

  _buildDailyPlanPrompt(user, goals, habits, tasks, date) {
    return `Create a detailed daily plan for ${new Date(date).toLocaleDateString()}.
    
User Info:
- Wake time: ${user.settings?.wakeTime || '7:00'}
- Sleep time: ${user.settings?.sleepTime || '23:00'}
- Productivity hours: ${user.settings?.productivityHoursStart || '9:00'} - ${user.settings?.productivityHoursEnd || '17:00'}

Active Goals:
${goals.map(g => `- ${g.title}: ${g.description || 'No description'}`).join('\n')}

Daily Habits:
${habits.filter(h => h.frequency === 'DAILY').map(h => `- ${h.name}`).join('\n')}

Pending Tasks (Priority):
${tasks.map(t => `- [${t.priority}] ${t.title}`).join('\n')}

Create a structured daily plan with:
1. Morning routine
2. Afternoon tasks
3. Evening routine
Include specific time blocks and priorities.`;
  }

  _buildRecommendationPrompt(goals, habits, tasks, plans) {
    return `Analyze this user's data and provide 3-5 personalized recommendations:

Goals: ${goals.length} (${goals.filter(g => g.status === 'COMPLETED').length} completed)
Habits: ${habits.length} active
Tasks: ${tasks.length} total (${tasks.filter(t => t.status === 'COMPLETED').length} completed)
Plans: ${plans.length} recent plans

Provide specific, actionable recommendations for improvement.`;
  }

  _generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new AIService();
