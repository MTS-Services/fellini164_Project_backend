const express = require("express");
const router = express.Router();
const goalController = require("../controllers/goalController");
const { protect } = require("../middleware/auth");
const {
  createGoalValidator,
  updateGoalValidator,
  linkTasksValidator,
  linkHabitsValidator,
  generateGoalValidator,
  improveGoalValidator,
  goalAiSuggestValidator,
  goalAiSuggestionIdValidator,
  unlinkTaskValidator,
  unlinkHabitValidator,
  idValidator,
  validate,
} = require("../middleware/validator");

router.use(protect);

// Board summary (must be before /:id)
router.get("/summary", goalController.getBoardSummary);

// AI generation (must be before /:id)
router.post(
  "/ai/generate",
  generateGoalValidator,
  validate,
  goalController.generateGoal,
);

// Goal AI Assistant — accept / dismiss / get by id (must be before /:id)
router.post(
  "/ai/suggestions/:suggestionId/accept",
  goalAiSuggestionIdValidator,
  validate,
  goalController.acceptSuggestion,
);
router.post(
  "/ai/suggestions/:suggestionId/dismiss",
  goalAiSuggestionIdValidator,
  validate,
  goalController.dismissSuggestion,
);
router.get(
  "/ai/suggestions/:suggestionId",
  goalAiSuggestionIdValidator,
  validate,
  goalController.getSuggestion,
);

router.get("/", goalController.getAllGoals);
router.post("/", createGoalValidator, validate, goalController.createGoal);

router.get("/:id/progress", idValidator, validate, goalController.getGoalProgress);
router.get("/:id/tasks", idValidator, validate, goalController.getGoalTasks);
router.get("/:id/habits", idValidator, validate, goalController.getGoalHabits);

router.post(
  "/:id/link-tasks",
  linkTasksValidator,
  validate,
  goalController.linkTasks,
);
router.post(
  "/:id/link-habits",
  linkHabitsValidator,
  validate,
  goalController.linkHabits,
);

// Goal AI Assistant — suggest / list / undo (goal-scoped)
router.post(
  "/:id/ai/suggest",
  goalAiSuggestValidator,
  validate,
  goalController.suggestWithAI,
);
router.get(
  "/:id/ai/suggestions",
  idValidator,
  validate,
  goalController.getSuggestions,
);
router.post(
  "/:id/ai/undo",
  idValidator,
  validate,
  goalController.undoAiChange,
);

// Immediate improve (legacy / direct apply)
router.post(
  "/:id/ai/improve",
  improveGoalValidator,
  validate,
  goalController.improveGoal,
);

router.patch("/:id/pause", idValidator, validate, goalController.pauseGoal);
router.patch(
  "/:id/complete",
  idValidator,
  validate,
  goalController.completeGoal,
);

router.delete(
  "/:id/unlink-tasks/:taskId",
  unlinkTaskValidator,
  validate,
  goalController.unlinkTask,
);
router.delete(
  "/:id/unlink-habits/:habitId",
  unlinkHabitValidator,
  validate,
  goalController.unlinkHabit,
);

router.get("/:id", idValidator, validate, goalController.getGoalById);
router.patch("/:id", updateGoalValidator, validate, goalController.updateGoal);
router.delete("/:id", idValidator, validate, goalController.deleteGoal);

module.exports = router;
