const plannerService = require("../services/plannerService");

const getErrorStatus = (error, fallback = 500) => error.statusCode || fallback;

exports.getSummary = async (req, res) => {
  try {
    const summary = await plannerService.getSummary(req.user.id, {
      date: req.query.date,
    });
    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get planner summary error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to fetch planner summary",
    });
  }
};

exports.getBoard = async (req, res) => {
  try {
    const board = await plannerService.getBoard(req.user.id, {
      viewType: req.query.viewType || "DAILY",
      date: req.query.date,
    });
    res.json({ success: true, board });
  } catch (error) {
    console.error("Get planner board error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to fetch planner board",
    });
  }
};

exports.getAvailableItems = async (req, res) => {
  try {
    const available = await plannerService.getAvailableItems(req.user.id, {
      date: req.query.date,
    });
    res.json({ success: true, ...available });
  } catch (error) {
    console.error("Get available planner items error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to fetch available items",
    });
  }
};

exports.listItems = async (req, res) => {
  try {
    const items = await plannerService.listItems(req.user.id, {
      viewType: req.query.viewType,
      itemType: req.query.itemType,
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      aiScheduled: req.query.aiScheduled,
    });
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("List planner items error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to list planner items",
    });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await plannerService.getItemById(req.params.id, req.user.id);
    res.json({ success: true, item });
  } catch (error) {
    console.error("Get planner item error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to fetch planner item",
    });
  }
};

exports.createItem = async (req, res) => {
  try {
    const item = await plannerService.createItem(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Item scheduled successfully",
      item,
    });
  } catch (error) {
    console.error("Create planner item error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to schedule item",
    });
  }
};

exports.bulkSchedule = async (req, res) => {
  try {
    const result = await plannerService.bulkSchedule(
      req.user.id,
      req.body.placements,
      {
        viewType: req.body.viewType,
        aiScheduled: req.body.aiScheduled || false,
      },
    );
    res.status(201).json({
      success: true,
      message: `${result.count} items scheduled`,
      ...result,
    });
  } catch (error) {
    console.error("Bulk schedule error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to bulk schedule items",
    });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await plannerService.updateItem(
      req.params.id,
      req.user.id,
      req.body,
    );
    res.json({
      success: true,
      message: "Planner item updated",
      item,
    });
  } catch (error) {
    console.error("Update planner item error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to update planner item",
    });
  }
};

exports.completeItem = async (req, res) => {
  try {
    const item = await plannerService.completeItem(req.params.id, req.user.id);
    res.json({
      success: true,
      message: "Planner slot marked complete",
      item,
    });
  } catch (error) {
    console.error("Complete planner item error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to complete planner item",
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await plannerService.deleteItem(req.params.id, req.user.id);
    res.json({ success: true, message: "Planner item removed" });
  } catch (error) {
    console.error("Delete planner item error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to delete planner item",
    });
  }
};

exports.suggestWithAI = async (req, res) => {
  try {
    const result = await plannerService.createAiSuggestion(req.user.id, {
      action: req.body.action,
      viewType: req.body.viewType,
      date: req.body.date,
      message: req.body.message,
    });
    res.json({
      success: true,
      message: result.message,
      ...result,
    });
  } catch (error) {
    console.error("Planner AI suggest error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to generate planner suggestion",
    });
  }
};

exports.acceptSuggestion = async (req, res) => {
  try {
    const result = await plannerService.acceptAiSuggestion(
      req.params.id,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Accept planner suggestion error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to accept suggestion",
    });
  }
};

exports.dismissSuggestion = async (req, res) => {
  try {
    const result = await plannerService.dismissAiSuggestion(
      req.params.id,
      req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Dismiss planner suggestion error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to dismiss suggestion",
    });
  }
};

exports.undoAiChange = async (req, res) => {
  try {
    const result = await plannerService.undoLastAiChange(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Undo planner change error:", error);
    res.status(getErrorStatus(error, 404)).json({
      success: false,
      message: error.message || "Failed to undo planner change",
    });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const result = await plannerService.createPlan(req.user.id, {
      prompt: req.body.prompt,
      dateRange: req.body.dateRange,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      ...result,
    });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Failed to create plan",
    });
  }
};
