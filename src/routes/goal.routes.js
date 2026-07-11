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
