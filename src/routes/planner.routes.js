const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const { protect } = require('../middleware/auth');
const {
  createPlannerItemValidator,
  updatePlannerItemValidator,
  bulkScheduleValidator,
  plannerAiSuggestValidator,
  createPlanValidator,
  idValidator,
  validate,
} = require('../middleware/validator');

router.use(protect);

// Board & summary (before /:id)
router.get('/summary', plannerController.getSummary);
router.get('/board', plannerController.getBoard);
router.get('/available', plannerController.getAvailableItems);

// AI planner (before /:id)
router.post('/ai/suggest', plannerAiSuggestValidator, validate, plannerController.suggestWithAI);
router.post('/ai/suggestions/:id/accept', idValidator, validate, plannerController.acceptSuggestion);
router.post('/ai/suggestions/:id/dismiss', idValidator, validate, plannerController.dismissSuggestion);
router.post('/ai/undo', plannerController.undoAiChange);

// New Plan modal (+ Create Plan button)
router.post('/create-plan', createPlanValidator, validate, plannerController.createPlan);

// Bulk schedule (manual placements)
router.post('/bulk/schedule', bulkScheduleValidator, validate, plannerController.bulkSchedule);

// List & create
router.get('/', plannerController.listItems);
router.post('/', createPlannerItemValidator, validate, plannerController.createItem);

// Item sub-resources
router.patch('/:id/complete', idValidator, validate, plannerController.completeItem);

// Single item CRUD
router.get('/:id', idValidator, validate, plannerController.getItemById);
router.patch('/:id', updatePlannerItemValidator, validate, plannerController.updateItem);
router.delete('/:id', idValidator, validate, plannerController.deleteItem);

module.exports = router;
