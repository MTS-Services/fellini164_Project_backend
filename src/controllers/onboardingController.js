const onboardingService = require("../services/onboardingService");

const handleError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
    error: error.message,
  });
};

exports.getStatus = async (req, res) => {
  try {
    const status = await onboardingService.getStatus(req.user.id);
    res.json({ success: true, data: status });
  } catch (error) {
    handleError(res, error, "Get onboarding status error:");
  }
};

exports.saveStep = async (req, res) => {
  try {
    const status = await onboardingService.saveStep(req.user.id, req.body);
    res.json({
      success: true,
      message: "Onboarding progress saved",
      data: status,
    });
  } catch (error) {
    handleError(res, error, "Save onboarding step error:");
  }
};

exports.generatePlan = async (req, res) => {
  try {
    const result = await onboardingService.generatePlan(req.user.id);
    res.status(201).json({
      success: true,
      message: "Onboarding plan generated. Accept or dismiss each suggestion.",
      ...result,
    });
  } catch (error) {
    handleError(res, error, "Generate onboarding plan error:");
  }
};

exports.listSuggestions = async (req, res) => {
  try {
    const result = await onboardingService.listSuggestions(req.user.id, {
      status: req.query.status || "pending",
      type: req.query.type,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, "List onboarding suggestions error:");
  }
};

exports.acceptSuggestion = async (req, res) => {
  try {
    const result = await onboardingService.acceptSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, "Accept onboarding suggestion error:");
  }
};

exports.dismissSuggestion = async (req, res) => {
  try {
    const result = await onboardingService.dismissSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    handleError(res, error, "Dismiss onboarding suggestion error:");
  }
};

exports.regenerateSuggestion = async (req, res) => {
  try {
    const suggestion = await onboardingService.regenerateSuggestion(
      req.params.suggestionId,
      req.user.id,
    );
    res.json({
      success: true,
      message: "Suggestion regenerated",
      suggestion,
    });
  } catch (error) {
    handleError(res, error, "Regenerate onboarding suggestion error:");
  }
};
