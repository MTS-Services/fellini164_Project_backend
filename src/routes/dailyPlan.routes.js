const express = require("express");
const router = express.Router();
const dailyPlanController = require("../controllers/dailyPlanController");
const { protect } = require("../middleware/auth");

// Apply authentication to all routes
router.use(protect);

router.get("/today", dailyPlanController.getTodayPlan);

router.post("/reset", dailyPlanController.resetMyDay);

router.get("/:planId/reset-history", dailyPlanController.getResetHistory);

router.post("/", dailyPlanController.createDailyPlan);

router.get("/", dailyPlanController.getAllDailyPlans);

router.get("/:id", dailyPlanController.getDailyPlanById);

router.put("/:id", dailyPlanController.updateDailyPlan);

router.delete("/:id", dailyPlanController.deleteDailyPlan);

module.exports = router;
