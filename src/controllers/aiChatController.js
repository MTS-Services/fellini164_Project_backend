const prisma = require("../config/database");
const openaiService = require("../services/openaiService");

exports.chat = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required and cannot be empty",
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "AI service not configured",
        message: "Please set OPENAI_API_KEY in .env file",
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            take: 90,
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found",
        });
      }

      // Check if user owns this conversation
      if (conversation.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized to access this conversation",
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          type: "chat",
        },
        include: {
          messages: true,
        },
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Get user context (goals, current plans, etc.)
    const userGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        title: true,
        category: true,
      },
      take: 5,
    });

    const userContext = {
      goals:
        userGoals.length > 0
          ? userGoals.map((g) => `${g.title} (${g.category})`).join(", ")
          : null,
    };

    // Get AI response with conversation history
    const aiResponse = await openaiService.lifeCoachChat(
      message,
      conversation.messages,
      userContext,
    );

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Log AI chat activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: "AI_CHAT",
        description: "AI Life Coach conversation",
        metadata: {
          conversationId: conversation.id,
          tokensUsed: aiResponse.usage?.total_tokens,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage,
      },
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process chat",
      message: error.message,
    });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to access this conversation",
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Get Conversation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversation",
      message: error.message,
    });
  }
};

exports.getAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 9000, offset = 0 } = req.query;

    const where = { userId };
    if (type) {
      where.type = type;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.conversation.count({ where });

    res.status(200).json({
      success: true,
      data: {
        conversations,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Get All Conversations Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations",
      message: error.message,
    });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to delete this conversation",
      });
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete Conversation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete conversation",
      message: error.message,
    });
  }
};

exports.quickChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "AI service not configured",
      });
    }

    const aiResponse = await openaiService.quickResponse(message);

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse.content,
        model: aiResponse.model,
        usage: aiResponse.usage,
      },
    });
  } catch (error) {
    console.error("Quick Chat Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process quick chat",
      message: error.message,
    });
  }
};

exports.updateConversationTitle = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: "Title is required",
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to update this conversation",
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: title.trim() },
    });

    res.status(200).json({
      success: true,
      data: updatedConversation,
    });
  } catch (error) {
    console.error("Update Conversation Title Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update conversation title",
      message: error.message,
    });
  }
};

exports.pinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to pin this conversation",
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned: true },
    });

    res.status(200).json({
      success: true,
      message: "Conversation pinned successfully",
      data: updatedConversation,
    });
  } catch (error) {
    console.error("Pin Conversation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to pin conversation",
      message: error.message,
    });
  }
};

exports.unpinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to unpin this conversation",
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned: false },
    });

    res.status(200).json({
      success: true,
      message: "Conversation unpinned successfully",
      data: updatedConversation,
    });
  } catch (error) {
    console.error("Unpin Conversation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unpin conversation",
      message: error.message,
    });
  }
};

exports.togglePinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to modify this conversation",
      });
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned: !conversation.pinned },
    });

    res.status(200).json({
      success: true,
      message: `Conversation ${updatedConversation.pinned ? "pinned" : "unpinned"} successfully`,
      data: updatedConversation,
    });
  } catch (error) {
    console.error("Toggle Pin Conversation Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle pin status",
      message: error.message,
    });
  }
};
