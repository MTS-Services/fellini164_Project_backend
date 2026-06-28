const express = require("express");
const router = express.Router();
const planController = require("../controllers/planController");

// Daily plans
router.get("/daily", planController.getAllDailyPlans);
router.post("/daily", planController.createDailyPlan);

// Weekly plans
router.get("/weekly", planController.getAllWeeklyPlans);
router.post("/weekly", planController.createWeeklyPlan);

// Monthly plans
router.get("/monthly", planController.getAllMonthlyPlans);
router.post("/monthly", planController.createMonthlyPlan);

module.exports = router;
