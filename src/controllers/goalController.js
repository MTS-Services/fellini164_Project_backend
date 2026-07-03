const goalService = require("../services/goalService");

const handleError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
    error: error.message,
  });
};

exports.getBoardSummary = async (req, res) => {
  try {
    const summary = await goalService.getBoardSummary(req.user.id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    handleError(res, error, "Get goal summary error:");
  }
};

exports.getAllGoals = async (req, res) => {
  try {
    const result = await goalService.getAllGoals(req.user.id, {
      status: req.query.status,
      category: req.query.category,
      priorityLevel: req.query.priorityLevel,
      source: req.query.source,
      search: req.query.search,
      minProgress: req.query.minProgress,
      maxProgress: req.query.maxProgress,
      dueFilter: req.query.dueFilter,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      count: result.goals.length,
      data: result.goals,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, "Get goals error:");
  }
};

exports.getGoalById = async (req, res) => {
  try {
    const goal = await goalService.getGoalById(req.params.id, req.user.id);

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Get goal error:");
  }
};

exports.createGoal = async (req, res) => {
  try {
    const goal = await goalService.createGoal(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Goal created successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Create goal error:");
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const goal = await goalService.updateGoal(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      message: "Goal updated successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Update goal error:");
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    await goalService.deleteGoal(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (error) {
    handleError(res, error, "Delete goal error:");
  }
};

exports.pauseGoal = async (req, res) => {
  try {
    const goal = await goalService.pauseGoal(req.params.id, req.user.id);

    const message =
      goal.status === "PAUSED"
        ? "Goal paused successfully"
        : "Goal activated successfully";

    res.json({
      success: true,
      message,
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Pause goal error:");
  }
};

exports.completeGoal = async (req, res) => {
  try {
    const goal = await goalService.completeGoal(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Goal completed successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Complete goal error:");
  }
};

exports.linkTasks = async (req, res) => {
  try {
    const goal = await goalService.linkTasks(
      req.params.id,
      req.user.id,
      req.body.taskIds,
    );

    res.json({
      success: true,
      message: "Tasks linked successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Link tasks error:");
  }
};

exports.linkHabits = async (req, res) => {
  try {
    const goal = await goalService.linkHabits(
      req.params.id,
      req.user.id,
      req.body.habitIds,
    );

    res.json({
      success: true,
      message: "Habits linked successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Link habits error:");
  }
};

exports.unlinkTask = async (req, res) => {
  try {
    const result = await goalService.unlinkTask(
      req.params.id,
      req.user.id,
      req.params.taskId,
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error, "Unlink task error:");
  }
};

exports.unlinkHabit = async (req, res) => {
  try {
    const result = await goalService.unlinkHabit(
      req.params.id,
      req.user.id,
      req.params.habitId,
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    handleError(res, error, "Unlink habit error:");
  }
};

exports.getGoalTasks = async (req, res) => {
  try {
    const tasks = await goalService.getGoalTasks(req.params.id, req.user.id);

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    handleError(res, error, "Get goal tasks error:");
  }
};

exports.getGoalHabits = async (req, res) => {
  try {
    const habits = await goalService.getGoalHabits(req.params.id, req.user.id);

    res.json({
      success: true,
      count: habits.length,
      data: habits,
    });
  } catch (error) {
    handleError(res, error, "Get goal habits error:");
  }
};

exports.getGoalProgress = async (req, res) => {
  try {
    const progress = await goalService.getGoalProgress(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    handleError(res, error, "Get goal progress error:");
  }
};

exports.generateGoal = async (req, res) => {
  try {
    const { prompt, category } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "prompt is required for AI goal generation",
      });
    }

    const result = await goalService.generateGoalWithAI(req.user.id, {
      prompt,
      category,
    });

    res.status(201).json({
      success: true,
      message: "Goal generated successfully",
      data: result.goal,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    handleError(res, error, "Generate goal error:");
  }
};

exports.improveGoal = async (req, res) => {
  try {
    const goal = await goalService.improveGoalWithAI(
      req.params.id,
      req.user.id,
      req.body.instructions,
    );

    res.json({
      success: true,
      message: "Goal improved successfully",
      data: goal,
    });
  } catch (error) {
    handleError(res, error, "Improve goal error:");
  }
};
