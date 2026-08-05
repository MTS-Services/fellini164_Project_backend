const prisma = require("../config/database");
const openaiService = require("../services/openaiService");
/**
 * AI Task Suggestions based on goals
 */
exports.suggestTasks = async (req, res) => {
  try {
    const { goals, timeAvailable, conversationId } = req.body;
    const userId = req.user.id;

    if (!goals || !timeAvailable) {
      return res.status(400).json({
        success: false,
        error: "goals and timeAvailable are required",
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "AI service not configured",
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found or unauthorized",
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: "Task Suggestions - " + new Date().toLocaleDateString(),
          type: "chat",
        },
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: `Goals: ${goals}\nTime available: ${timeAvailable}`,
      },
    });

    const aiResponse = await openaiService.suggestTasks(goals, timeAvailable);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        tasks: aiResponse.content,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage,
      },
    });
  } catch (error) {
    console.error("Task Suggestion Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to suggest tasks",
      message: error.message,
    });
  }
};

/**
 * AI Morning Routine Suggestion
 */
exports.suggestMorningRoutine = async (req, res) => {
  try {
    const { wakeUpTime, workStartTime, preferences, conversationId } = req.body;
    const userId = req.user.id;

    if (!wakeUpTime || !workStartTime) {
      return res.status(400).json({
        success: false,
        error: "wakeUpTime and workStartTime are required",
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "AI service not configured",
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: "Conversation not found or unauthorized",
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: "Morning Routine Suggestion",
          type: "chat",
        },
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: `Wake up: ${wakeUpTime}, Work starts: ${workStartTime}${preferences ? `, Preferences: ${preferences}` : ""}`,
      },
    });

    const aiResponse = await openaiService.suggestMorningRoutine(
      wakeUpTime,
      workStartTime,
      preferences ? { personalGoals: preferences } : {},
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

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        routine: aiResponse.content,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage,
      },
    });
  } catch (error) {
    console.error("Morning Routine Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate morning routine",
      message: error.message,
    });
  }
};

/**
 * Get all plans (daily, weekly, monthly) for a user
 */
exports.getAllPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status, limit = 1000 } = req.query;

    const result = {};

    if (!type || type === "daily") {
      const where = { userId };
      if (status) where.status = status;

      result.dailyPlans = await prisma.dailyPlan.findMany({
        where,
        orderBy: { date: "desc" },
        take: parseInt(limit),
      });
    }

    if (!type || type === "weekly") {
      const where = { userId };
      if (status) where.status = status;

      result.weeklyPlans = await prisma.weeklyPlan.findMany({
        where,
        orderBy: { weekStartDate: "desc" },
        take: parseInt(limit),
      });
    }

    if (!type || type === "monthly") {
      const where = { userId };
      if (status) where.status = status;

      result.monthlyPlans = await prisma.monthlyPlan.findMany({
        where,
        orderBy: { monthStartDate: "desc" },
        take: parseInt(limit),
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get All Plans Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch plans",
      message: error.message,
    });
  }
};

/**
 * Get specific plan by ID
 */
exports.getPlanById = async (req, res) => {
  try {
    const { planType, planId } = req.params;
    const userId = req.user.id;

    let plan;

    switch (planType) {
      case "daily":
        plan = await prisma.dailyPlan.findUnique({
          where: { id: planId },
        });
        break;
      case "weekly":
        plan = await prisma.weeklyPlan.findUnique({
          where: { id: planId },
        });
        break;
      case "monthly":
        plan = await prisma.monthlyPlan.findUnique({
          where: { id: planId },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid planType. Use: daily, weekly, or monthly",
        });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
      });
    }

    if (plan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized to access this plan",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Get Plan Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch plan",
      message: error.message,
    });
  }
};

/**
 * Update plan status or completion
 */
exports.updatePlan = async (req, res) => {
  try {
    const { planType, planId } = req.params;
    const { status, completionRate, tasksCompleted, tasksTotal } = req.body;
    const userId = req.user.id;

    let plan;
    let updateData = {};

    if (status) updateData.status = status;
    if (completionRate !== undefined)
      updateData.completionRate = completionRate;
    if (tasksCompleted !== undefined)
      updateData.tasksCompleted = tasksCompleted;
    if (tasksTotal !== undefined) updateData.tasksTotal = tasksTotal;

    switch (planType) {
      case "daily":
        // Verify ownership
        const dailyPlan = await prisma.dailyPlan.findUnique({
          where: { id: planId },
        });
        if (!dailyPlan || dailyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        plan = await prisma.dailyPlan.update({
          where: { id: planId },
          data: updateData,
        });
        break;
      case "weekly":
        const weeklyPlan = await prisma.weeklyPlan.findUnique({
          where: { id: planId },
        });
        if (!weeklyPlan || weeklyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        plan = await prisma.weeklyPlan.update({
          where: { id: planId },
          data: updateData,
        });
        break;
      case "monthly":
        const monthlyPlan = await prisma.monthlyPlan.findUnique({
          where: { id: planId },
        });
        if (!monthlyPlan || monthlyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        plan = await prisma.monthlyPlan.update({
          where: { id: planId },
          data: updateData,
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid planType. Use: daily, weekly, or monthly",
        });
    }

    // Log activity if completed
    if (status === "COMPLETED") {
      await prisma.activityLog.create({
        data: {
          userId,
          type: "PLAN_COMPLETED",
          description: `Completed ${planType} plan`,
          metadata: { planId },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Update Plan Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update plan",
      message: error.message,
    });
  }
};

/**
 * Delete a plan
 */
exports.deletePlan = async (req, res) => {
  try {
    const { planType, planId } = req.params;
    const userId = req.user.id;

    switch (planType) {
      case "daily":
        const dailyPlan = await prisma.dailyPlan.findUnique({
          where: { id: planId },
        });
        if (!dailyPlan || dailyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        await prisma.dailyPlan.delete({
          where: { id: planId },
        });
        break;
      case "weekly":
        const weeklyPlan = await prisma.weeklyPlan.findUnique({
          where: { id: planId },
        });
        if (!weeklyPlan || weeklyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        await prisma.weeklyPlan.delete({
          where: { id: planId },
        });
        break;
      case "monthly":
        const monthlyPlan = await prisma.monthlyPlan.findUnique({
          where: { id: planId },
        });
        if (!monthlyPlan || monthlyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized or plan not found",
          });
        }
        await prisma.monthlyPlan.delete({
          where: { id: planId },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid planType. Use: daily, weekly, or monthly",
        });
    }

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete Plan Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete plan",
      message: error.message,
    });
  }
};
