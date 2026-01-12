const express = require('express');
const router = express.Router();
const dailyPlanController = require('../controllers/dailyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

/**
 * @route   POST /api/daily-plans
 * @desc    Create a new daily plan
 * @access  Private
 */
router.post('/', dailyPlanController.createDailyPlan);


router.get('/', dailyPlanController.getAllDailyPlans);

router.get('/:id', dailyPlanController.getDailyPlanById);


router.put('/:id', dailyPlanController.updateDailyPlan);


router.delete('/:id', dailyPlanController.deleteDailyPlan);

module.exports = router;
