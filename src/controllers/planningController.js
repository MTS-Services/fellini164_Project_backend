const prisma = require('../config/database');
const openaiService = require('../services/openaiService');

/**
 * Generate Daily Plan using AI
 */
exports.generateDailyPlan = async (req, res) => {
  try {
    const { userInput, date, conversationId } = req.body;
    const userId = req.user.id;

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({
        success: false,
        error: 'userInput is required. Describe your goals, schedule, and preferences for the day.'
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'Please set OPENAI_API_KEY in .env file'
      });
    }

    // Get user preferences
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    const userPreferences = {
      wakeTime: userSettings?.wakeTime || '07:00',
      workHours: userSettings?.workHoursPerDay || 8
    };

    let conversation;
    
    // If conversationId provided, verify it
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } else {
      // Create new conversation for daily plan
      const planDate = date ? new Date(date) : new Date();
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: `Daily Plan - ${planDate.toLocaleDateString()}`,
          type: 'daily-plan'
        }
      });
    }

    // Save user request
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: `Generate a daily plan: ${userInput}`
      }
    });

    // Generate daily plan using AI
    const aiResponse = await openaiService.generateDailyPlan(userInput, userPreferences);

    // Save AI response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    // Save to DailyPlan table
    const planDate = date ? new Date(date) : new Date();
    planDate.setHours(0, 0, 0, 0);

    const dailyPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: {
          userId,
          date: planDate
        }
      },
      update: {
        title: `Daily Plan - ${planDate.toLocaleDateString()}`,
        content: aiResponse.content,
        aiGenerated: true,
        status: 'ACTIVE'
      },
      create: {
        userId,
        date: planDate,
        title: `Daily Plan - ${planDate.toLocaleDateString()}`,
        content: aiResponse.content,
        aiGenerated: true,
        status: 'ACTIVE'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'PLAN_CREATED',
        description: 'Generated daily plan with AI',
        metadata: {
          planId: dailyPlan.id,
          conversationId: conversation.id
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        plan: aiResponse.content,
        dailyPlan,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    console.error('Generate Daily Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily plan',
      message: error.message
    });
  }
};

/**
 * Generate Weekly Plan using AI
 */
exports.generateWeeklyPlan = async (req, res) => {
  try {
    const { userInput, weekStartDate, conversationId } = req.body;
    const userId = req.user.id;

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({
        success: false,
        error: 'userInput is required. Describe your weekly goals and schedule.'
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    let conversation;
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } else {
      const startDate = weekStartDate ? new Date(weekStartDate) : new Date();
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: `Weekly Plan - Week of ${startDate.toLocaleDateString()}`,
          type: 'weekly-plan'
        }
      });
    }

    // Save user request
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: `Generate a weekly plan: ${userInput}`
      }
    });

    // Generate weekly plan
    const aiResponse = await openaiService.generateWeeklyPlan(userInput);

    // Save AI response
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    // Save to WeeklyPlan table
    const startDate = weekStartDate ? new Date(weekStartDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    let weeklyPlan;

    // If conversationId is provided, find and update existing plan from this conversation
    if (conversationId) {
      // Check if there's an existing weekly plan linked to this conversation
      const existingPlan = await prisma.weeklyPlan.findFirst({
        where: {
          userId,
          weekStartDate: startDate
        }
      });

      if (existingPlan) {
        // Update existing plan - no new row created
        weeklyPlan = await prisma.weeklyPlan.update({
          where: { id: existingPlan.id },
          data: {
            title: `Weekly Plan - Week of ${startDate.toLocaleDateString()}`,
            content: aiResponse.content,
            aiGenerated: true,
            status: 'ACTIVE',
            weekEndDate: endDate,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new plan if none exists for this week
        weeklyPlan = await prisma.weeklyPlan.create({
          data: {
            userId,
            weekStartDate: startDate,
            weekEndDate: endDate,
            title: `Weekly Plan - Week of ${startDate.toLocaleDateString()}`,
            content: aiResponse.content,
            aiGenerated: true,
            status: 'ACTIVE'
          }
        });
      }
    } else {
      // No conversationId - delete old plans for this week and create fresh one
      await prisma.weeklyPlan.deleteMany({
        where: {
          userId,
          weekStartDate: {
            gte: startDate,
            lt: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      weeklyPlan = await prisma.weeklyPlan.create({
        data: {
          userId,
          weekStartDate: startDate,
          weekEndDate: endDate,
          title: `Weekly Plan - Week of ${startDate.toLocaleDateString()}`,
          content: aiResponse.content,
          aiGenerated: true,
          status: 'ACTIVE'
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'PLAN_CREATED',
        description: 'Generated weekly plan with AI',
        metadata: {
          planId: weeklyPlan.id,
          conversationId: conversation.id
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        plan: aiResponse.content,
        weeklyPlan,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    console.error('Generate Weekly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly plan',
      message: error.message
    });
  }
};

/**
 * Generate Monthly Plan using AI
 */
exports.generateMonthlyPlan = async (req, res) => {
  try {
    const { userInput, monthStartDate, conversationId } = req.body;
    const userId = req.user.id;

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({
        success: false,
        error: 'userInput is required. Describe your monthly goals and objectives.'
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    let conversation;
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } else {
      const startDate = monthStartDate ? new Date(monthStartDate) : new Date();
      const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: `Monthly Plan - ${monthName}`,
          type: 'monthly-plan'
        }
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: `Generate a monthly plan: ${userInput}`
      }
    });

    const aiResponse = await openaiService.generateMonthlyPlan(userInput);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    // Save to MonthlyPlan table
    const startDate = monthStartDate ? new Date(monthStartDate) : new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    let monthlyPlan;

    // If conversationId is provided, find and update existing plan from this conversation
    if (conversationId) {
      // Check if there's an existing monthly plan for this month
      const existingPlan = await prisma.monthlyPlan.findFirst({
        where: {
          userId,
          monthStartDate: startDate
        }
      });

      if (existingPlan) {
        // Update existing plan - no new row created
        monthlyPlan = await prisma.monthlyPlan.update({
          where: { id: existingPlan.id },
          data: {
            title: `Monthly Plan - ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            content: aiResponse.content,
            aiGenerated: true,
            status: 'ACTIVE',
            monthEndDate: endDate,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new plan if none exists for this month
        monthlyPlan = await prisma.monthlyPlan.create({
          data: {
            userId,
            monthStartDate: startDate,
            monthEndDate: endDate,
            title: `Monthly Plan - ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            content: aiResponse.content,
            aiGenerated: true,
            status: 'ACTIVE'
          }
        });
      }
    } else {
      // No conversationId - delete old plans for this month and create fresh one
      await prisma.monthlyPlan.deleteMany({
        where: {
          userId,
          monthStartDate: startDate
        }
      });

      monthlyPlan = await prisma.monthlyPlan.create({
        data: {
          userId,
          monthStartDate: startDate,
          monthEndDate: endDate,
          title: `Monthly Plan - ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          content: aiResponse.content,
          aiGenerated: true,
          status: 'ACTIVE'
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        type: 'PLAN_CREATED',
        description: 'Generated monthly plan with AI',
        metadata: {
          planId: monthlyPlan.id,
          conversationId: conversation.id
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        plan: aiResponse.content,
        monthlyPlan,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    console.error('Generate Monthly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly plan',
      message: error.message
    });
  }
};

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
        error: 'goals and timeAvailable are required'
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    let conversation;
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: 'Task Suggestions - ' + new Date().toLocaleDateString(),
          type: 'chat'
        }
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: `Goals: ${goals}\nTime available: ${timeAvailable}`
      }
    });

    const aiResponse = await openaiService.suggestTasks(goals, timeAvailable);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        tasks: aiResponse.content,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    console.error('Task Suggestion Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suggest tasks',
      message: error.message
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
        error: 'wakeUpTime and workStartTime are required'
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    let conversation;
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: 'Morning Routine Suggestion',
          type: 'chat'
        }
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: `Wake up: ${wakeUpTime}, Work starts: ${workStartTime}${preferences ? `, Preferences: ${preferences}` : ''}`
      }
    });

    const aiResponse = await openaiService.suggestMorningRoutine(
      wakeUpTime,
      workStartTime,
      preferences ? { personalGoals: preferences } : {}
    );

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.usage?.total_tokens,
        model: aiResponse.model
      }
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        routine: aiResponse.content,
        userMessage,
        assistantMessage,
        model: aiResponse.model,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    console.error('Morning Routine Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate morning routine',
      message: error.message
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

    if (!type || type === 'daily') {
      const where = { userId };
      if (status) where.status = status;

      result.dailyPlans = await prisma.dailyPlan.findMany({
        where,
        orderBy: { date: 'desc' },
        take: parseInt(limit)
      });
    }

    if (!type || type === 'weekly') {
      const where = { userId };
      if (status) where.status = status;

      result.weeklyPlans = await prisma.weeklyPlan.findMany({
        where,
        orderBy: { weekStartDate: 'desc' },
        take: parseInt(limit)
      });
    }

    if (!type || type === 'monthly') {
      const where = { userId };
      if (status) where.status = status;

      result.monthlyPlans = await prisma.monthlyPlan.findMany({
        where,
        orderBy: { monthStartDate: 'desc' },
        take: parseInt(limit)
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get All Plans Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
      message: error.message
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
      case 'daily':
        plan = await prisma.dailyPlan.findUnique({
          where: { id: planId }
        });
        break;
      case 'weekly':
        plan = await prisma.weeklyPlan.findUnique({
          where: { id: planId }
        });
        break;
      case 'monthly':
        plan = await prisma.monthlyPlan.findUnique({
          where: { id: planId }
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid planType. Use: daily, weekly, or monthly'
        });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    if (plan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this plan'
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan',
      message: error.message
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
    if (completionRate !== undefined) updateData.completionRate = completionRate;
    if (tasksCompleted !== undefined) updateData.tasksCompleted = tasksCompleted;
    if (tasksTotal !== undefined) updateData.tasksTotal = tasksTotal;

    switch (planType) {
      case 'daily':
        // Verify ownership
        const dailyPlan = await prisma.dailyPlan.findUnique({
          where: { id: planId }
        });
        if (!dailyPlan || dailyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        plan = await prisma.dailyPlan.update({
          where: { id: planId },
          data: updateData
        });
        break;
      case 'weekly':
        const weeklyPlan = await prisma.weeklyPlan.findUnique({
          where: { id: planId }
        });
        if (!weeklyPlan || weeklyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        plan = await prisma.weeklyPlan.update({
          where: { id: planId },
          data: updateData
        });
        break;
      case 'monthly':
        const monthlyPlan = await prisma.monthlyPlan.findUnique({
          where: { id: planId }
        });
        if (!monthlyPlan || monthlyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        plan = await prisma.monthlyPlan.update({
          where: { id: planId },
          data: updateData
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid planType. Use: daily, weekly, or monthly'
        });
    }

    // Log activity if completed
    if (status === 'COMPLETED') {
      await prisma.activityLog.create({
        data: {
          userId,
          type: 'PLAN_COMPLETED',
          description: `Completed ${planType} plan`,
          metadata: { planId }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan',
      message: error.message
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
      case 'daily':
        const dailyPlan = await prisma.dailyPlan.findUnique({
          where: { id: planId }
        });
        if (!dailyPlan || dailyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        await prisma.dailyPlan.delete({
          where: { id: planId }
        });
        break;
      case 'weekly':
        const weeklyPlan = await prisma.weeklyPlan.findUnique({
          where: { id: planId }
        });
        if (!weeklyPlan || weeklyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        await prisma.weeklyPlan.delete({
          where: { id: planId }
        });
        break;
      case 'monthly':
        const monthlyPlan = await prisma.monthlyPlan.findUnique({
          where: { id: planId }
        });
        if (!monthlyPlan || monthlyPlan.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized or plan not found'
          });
        }
        await prisma.monthlyPlan.delete({
          where: { id: planId }
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid planType. Use: daily, weekly, or monthly'
        });
    }

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plan',
      message: error.message
    });
  }
};

/**
 * Get all weekly plans for user
 */
exports.getAllWeeklyPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 1000, sortBy = 'desc' } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const weeklyPlans = await prisma.weeklyPlan.findMany({
      where,
      orderBy: { weekStartDate: sortBy === 'asc' ? 'asc' : 'desc' },
      take: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: weeklyPlans.length,
      data: weeklyPlans
    });
  } catch (error) {
    console.error('Get All Weekly Plans Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly plans',
      message: error.message
    });
  }
};

/**
 * Get specific weekly plan by ID
 */
exports.getWeeklyPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const weeklyPlan = await prisma.weeklyPlan.findUnique({
      where: { id }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        error: 'Weekly plan not found'
      });
    }

    if (weeklyPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this plan'
      });
    }

    res.status(200).json({
      success: true,
      data: weeklyPlan
    });
  } catch (error) {
    console.error('Get Weekly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly plan',
      message: error.message
    });
  }
};

/**
 * Delete weekly plan by ID
 */
exports.deleteWeeklyPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const weeklyPlan = await prisma.weeklyPlan.findUnique({
      where: { id }
    });

    if (!weeklyPlan) {
      return res.status(404).json({
        success: false,
        error: 'Weekly plan not found'
      });
    }

    if (weeklyPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this plan'
      });
    }

    await prisma.weeklyPlan.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Weekly plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete Weekly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete weekly plan',
      message: error.message
    });
  }
};

/**
 * Get all monthly plans for user
 */
exports.getAllMonthlyPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 1000, sortBy = 'desc' } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const monthlyPlans = await prisma.monthlyPlan.findMany({
      where,
      orderBy: { monthStartDate: sortBy === 'asc' ? 'asc' : 'desc' },
      take: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: monthlyPlans.length,
      data: monthlyPlans
    });
  } catch (error) {
    console.error('Get All Monthly Plans Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly plans',
      message: error.message
    });
  }
};

/**
 * Get specific monthly plan by ID
 */
exports.getMonthlyPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const monthlyPlan = await prisma.monthlyPlan.findUnique({
      where: { id }
    });

    if (!monthlyPlan) {
      return res.status(404).json({
        success: false,
        error: 'Monthly plan not found'
      });
    }

    if (monthlyPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this plan'
      });
    }

    res.status(200).json({
      success: true,
      data: monthlyPlan
    });
  } catch (error) {
    console.error('Get Monthly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly plan',
      message: error.message
    });
  }
};

/**
 * Delete monthly plan by ID
 */
exports.deleteMonthlyPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const monthlyPlan = await prisma.monthlyPlan.findUnique({
      where: { id }
    });

    if (!monthlyPlan) {
      return res.status(404).json({
        success: false,
        error: 'Monthly plan not found'
      });
    }

    if (monthlyPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this plan'
      });
    }

    await prisma.monthlyPlan.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Monthly plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete Monthly Plan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete monthly plan',
      message: error.message
    });
  }
};
