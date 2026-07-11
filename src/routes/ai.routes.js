const express = require("express");
const router = express.Router();
const aiChatController = require("../controllers/aiChatController");
const planningController = require("../controllers/planningController");
const { protect } = require("../middleware/auth");

// All AI routes require authentication
router.use(protect);

router.post("/chat", aiChatController.chat);

router.post("/quick-chat", aiChatController.quickChat);

router.get("/conversations", aiChatController.getAllConversations);

router.get("/conversations/:conversationId", aiChatController.getConversation);

router.put(
  "/conversations/:conversationId",
  aiChatController.updateConversationTitle,
);

router.post(
  "/conversations/:conversationId/pin",
  aiChatController.pinConversation,
);

router.delete(
  "/conversations/:conversationId",
  aiChatController.deleteConversation,
);

router.post("/generate/daily", planningController.generateDailyPlan);

router.post("/generate/weekly", planningController.generateWeeklyPlan);

router.get("/weekly", planningController.getAllWeeklyPlans);

router.get("/weekly/:id", planningController.getWeeklyPlanById);

router.put("/weekly/:id", planningController.updateWeeklyPlan);

router.delete("/weekly/:id", planningController.deleteWeeklyPlan);

router.post("/generate/monthly", planningController.generateMonthlyPlan);

router.get("/monthly", planningController.getAllMonthlyPlans);

router.get("/monthly/:id", planningController.getMonthlyPlanById);

router.put("/monthly/:id", planningController.updateMonthlyPlan);

router.delete("/monthly/:id", planningController.deleteMonthlyPlan);

router.post("/suggest-tasks", planningController.suggestTasks);

router.post("/morning-routine", planningController.suggestMorningRoutine);

router.get("/plans", planningController.getAllPlans);

router.get("/plans/:planType/:planId", planningController.getPlanById);

router.put("/plans/:planType/:planId", planningController.updatePlan);

router.delete("/plans/:planType/:planId", planningController.deletePlan);

router.get("/analyze/progress", (req, res) => {
  res.json({
    success: false,
    message: "AI progress analysis - Coming soon",
  });
});

router.get("/recommendations", (req, res) => {
  res.json({
    success: false,
    message: "Get AI recommendations - Coming soon",
  });
});

module.exports = router;
