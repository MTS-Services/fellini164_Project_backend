const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { protect, optionalAuth, authorize } = require("../middleware/auth");

// Public routes (works for both authenticated and guest users)
router.post("/chat/start", optionalAuth, supportController.startConversation);
router.post(
  "/chat/continue",
  optionalAuth,
  supportController.continueConversation,
);
router.post(
  "/chat/escalate",
  optionalAuth,
  supportController.escalateConversation,
);
router.post(
  "/chat/resolve",
  optionalAuth,
  supportController.resolveConversation,
);

// Knowledge base - Public access
router.get("/knowledge/search", supportController.searchKnowledgeBase);
router.get(
  "/knowledge/article/:articleId",
  supportController.getKnowledgeArticle,
);
router.post(
  "/knowledge/article/:articleId/rate",
  supportController.rateArticle,
);
router.get("/knowledge/quick-help", supportController.getQuickHelp);

// Authenticated user routes
router.get("/conversations", protect, supportController.getUserConversations);
router.get(
  "/conversations/:conversationId",
  optionalAuth,
  supportController.getConversationHistory,
);

// Admin routes
router.get(
  "/admin/conversations",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminGetAllConversations,
);
router.get(
  "/admin/analytics",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminGetAnalytics,
);
router.post(
  "/admin/conversations/:conversationId/respond",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminRespondToConversation,
);

// Admin knowledge base management
router.get(
  "/admin/knowledge",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminGetAllArticles,
);
router.post(
  "/admin/knowledge",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminManageKnowledgeArticle,
);
router.put(
  "/admin/knowledge/:articleId",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminManageKnowledgeArticle,
);
router.delete(
  "/admin/knowledge/:articleId",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  supportController.adminDeleteKnowledgeArticle,
);

module.exports = router;
