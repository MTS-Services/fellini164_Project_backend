const express = require("express");
const router = express.Router();
const habitController = require("../controllers/habitController");
const { protect } = require("../middleware/auth");
const {
  createHabitValidator,
  updateHabitValidator,
  completeHabitValidator,
  generateHabitValidator,
  improveHabitValidator,
  idValidator,
  validate,
} = require("../middleware/validator");

router.use(protect);

// Summary, stats, and utility routes must be before /:id
router.get("/summary", habitController.getBoardSummary);
router.get("/stats/overview", habitController.getHabitStats);
router.post("/test/email", habitController.testHabitEmail);

// AI generation must be before /:id
router.post(
  "/ai/generate",
  generateHabitValidator,
  validate,
  habitController.generateHabitWithAI,
);

// List & create
router.get("/", habitController.getAllHabits);
router.post("/", createHabitValidator, validate, habitController.createHabit);

// Habit sub-resources before bare /:id
router.get(
  "/:id/history",
  idValidator,
  validate,
  habitController.getHabitHistory,
);
router.post(
  "/:id/complete",
  completeHabitValidator,
  validate,
  habitController.completeHabit,
);
router.delete(
  "/:id/complete",
  idValidator,
  validate,
  habitController.undoCompletion,
);
router.post("/:id/skip", idValidator, validate, habitController.skipHabit);
router.patch("/:id/pause", idValidator, validate, habitController.pauseHabit);
router.patch(
  "/:id/complete-status",
  idValidator,
  validate,
  habitController.completeHabitStatus,
);
router.post(
  "/:id/ai/improve",
  improveHabitValidator,
  validate,
  habitController.improveHabitWithAI,
);

// Single habit CRUD
router.get("/:id", idValidator, validate, habitController.getHabitById);
router.patch(
  "/:id",
  updateHabitValidator,
  validate,
  habitController.updateHabit,
);
router.delete("/:id", idValidator, validate, habitController.deleteHabit);

module.exports = router;
