const aiSupportService = require('../services/aiSupportService');
const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Start a new support conversation
 */
exports.startConversation = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id || null;
    
    // Generate session ID for guest users
    const sessionId = userId ? null : req.body.sessionId || uuidv4();

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Get user context if logged in
    let userContext = {};
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          fullName: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          createdAt: true
        }
      });

      userContext = {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
      };
    }

    const result = await aiSupportService.startConversation(
      userId,
      sessionId,
      message,
      userContext
    );

    res.status(200).json({
      success: true,
      data: {
        conversationId: result.conversationId,
        message: result.message,
        shouldEscalate: result.shouldEscalate,
        sessionId: sessionId // Return for guest users
      }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation',
      error: error.message
    });
  }
};

/**
 * Continue existing conversation
 */
exports.continueConversation = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.user?.id || null;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and message are required'
      });
    }

    // Verify conversation belongs to user or is guest session
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check ownership
    if (conversation.userId && conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation'
      });
    }

    // Get user context if logged in
    let userContext = {};
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true
        }
      });

      userContext = {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus
      };
    }

    const result = await aiSupportService.continueConversation(
      conversationId,
      message,
      userContext
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error continuing conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to continue conversation',
      error: error.message
    });
  }
};

/**
 * Escalate conversation to human support
 */
exports.escalateConversation = async (req, res) => {
  try {
    const { conversationId, reason } = req.body;
    const userId = req.user?.id || null;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Verify conversation ownership
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (conversation.userId && conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation'
      });
    }

    const result = await aiSupportService.escalateToHuman(
      conversationId,
      reason || 'User requested human support'
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error escalating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate conversation',
      error: error.message
    });
  }
};

/**
 * Resolve conversation with feedback
 */
exports.resolveConversation = async (req, res) => {
  try {
    const { conversationId, satisfactionRating, wasHelpful } = req.body;
    const userId = req.user?.id || null;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Verify conversation ownership
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (conversation.userId && conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation'
      });
    }

    const result = await aiSupportService.resolveConversation(
      conversationId,
      satisfactionRating,
      wasHelpful
    );

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: result
    });
  } catch (error) {
    console.error('Error resolving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve conversation',
      error: error.message
    });
  }
};

/**
 * Get conversation history
 */
exports.getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id || null;

    const conversation = await aiSupportService.getConversationHistory(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify ownership
    if (conversation.userId && conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to conversation'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation history',
      error: error.message
    });
  }
};

/**
 * Get user's conversations
 */
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;

    const conversations = await aiSupportService.getUserConversations(userId, filters);

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error getting user conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

/**
 * Search knowledge base
 */
exports.searchKnowledgeBase = async (req, res) => {
  try {
    const { query, category } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = await aiSupportService.searchKnowledgeBase(query, category);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search knowledge base',
      error: error.message
    });
  }
};

/**
 * Get knowledge base article
 */
exports.getKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await prisma.supportKnowledgeBase.findUnique({
      where: { id: articleId, isActive: true }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment view count
    await prisma.supportKnowledgeBase.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } }
    });

    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error getting knowledge article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get article',
      error: error.message
    });
  }
};

/**
 * Mark article as helpful/not helpful
 */
exports.rateArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'helpful field must be a boolean'
      });
    }

    const updateData = helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } };

    await prisma.supportKnowledgeBase.update({
      where: { id: articleId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Error rating article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate article',
      error: error.message
    });
  }
};

/**
 * Get quick help suggestions
 */
exports.getQuickHelp = async (req, res) => {
  try {
    const suggestions = await prisma.supportKnowledgeBase.findMany({
      where: { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { viewCount: 'desc' }
      ],
      take: 8,
      select: {
        id: true,
        category: true,
        question: true
      }
    });

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting quick help:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quick help suggestions',
      error: error.message
    });
  }
};

/**
 * ADMIN: Get all support conversations
 */
exports.adminGetAllConversations = async (req, res) => {
  try {
    const { status, category, escalated, page = 1, limit = 20 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (escalated !== undefined) where.escalated = escalated === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [conversations, total] = await Promise.all([
      prisma.supportConversation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              subscriptionPlan: true
            }
          },
          messages: {
            take: 2,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.supportConversation.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting all conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

/**
 * ADMIN: Get support analytics
 */
exports.adminGetAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await aiSupportService.getAnalytics(start, end);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * ADMIN: Respond to conversation
 */
exports.adminRespondToConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    await prisma.supportMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        isFromUser: false,
        isFromAi: false,
        message,
        metadata: { respondedBy: adminId }
      }
    });

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Response sent successfully'
    });
  } catch (error) {
    console.error('Error responding to conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      error: error.message
    });
  }
};

/**
 * ADMIN: Create/Update knowledge base article
 */
exports.adminManageKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { category, question, answer, keywords, relatedArticles, priority, isActive } = req.body;
    const adminId = req.user.id;

    const data = {
      category,
      question,
      answer,
      keywords,
      relatedArticles,
      priority: priority || 0,
      isActive: isActive !== undefined ? isActive : true,
      updatedBy: adminId
    };

    let article;
    if (articleId) {
      // Update existing
      article = await prisma.supportKnowledgeBase.update({
        where: { id: articleId },
        data
      });
    } else {
      // Create new
      article = await prisma.supportKnowledgeBase.create({
        data
      });
    }

    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error managing knowledge article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage article',
      error: error.message
    });
  }
};

/**
 * ADMIN: Delete knowledge base article
 */
exports.adminDeleteKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    await prisma.supportKnowledgeBase.delete({
      where: { id: articleId }
    });

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article',
      error: error.message
    });
  }
};

/**
 * ADMIN: Get all knowledge base articles
 */
exports.adminGetAllArticles = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const articles = await prisma.supportKnowledgeBase.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { category: 'asc' }
      ]
    });

    res.status(200).json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Error getting all articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get articles',
      error: error.message
    });
  }
};

module.exports = exports;
