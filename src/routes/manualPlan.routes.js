const express = require('express');
const router = express.Router();
const manualPlanController = require('../controllers/manualPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

router.post('/', manualPlanController.createPlan);

router.get('/', manualPlanController.getAllPlans);

router.get('/stats', manualPlanController.getPlanStats);

router.get('/type/:type', manualPlanController.getPlansByType);

router.get('/:id', manualPlanController.getPlanById);

router.put('/:id', manualPlanController.updatePlan);

router.delete('/:id', manualPlanController.deletePlan);

module.exports = router;
