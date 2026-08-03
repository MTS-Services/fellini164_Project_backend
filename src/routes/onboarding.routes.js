const express = require("express");
const router = express.Router();
const onboardingController = require("../controllers/onboardingController");
const { protect } = require("../middleware/auth");
const {
  onboardingStepValidator,
  onboardingSuggestionIdValidator,
  onboardingListValidator,
  validate,
} = require("../middleware/validator");

router.use(protect);

router.get("/", onboardingController.getStatus);

router.put(
  "/step",
  onboardingStepValidator,
  validate,
  onboardingController.saveStep,
);

router.post("/generate", onboardingController.generatePlan);

router.get(
  "/suggestions",
  onboardingListValidator,
  validate,
  onboardingController.listSuggestions,
);

router.post(
  "/suggestions/:suggestionId/accept",
  onboardingSuggestionIdValidator,
  validate,
  onboardingController.acceptSuggestion,
);

router.post(
  "/suggestions/:suggestionId/dismiss",
  onboardingSuggestionIdValidator,
  validate,
  onboardingController.dismissSuggestion,
);

router.post(
  "/suggestions/:suggestionId/regenerate",
  onboardingSuggestionIdValidator,
  validate,
  onboardingController.regenerateSuggestion,
);

module.exports = router;
