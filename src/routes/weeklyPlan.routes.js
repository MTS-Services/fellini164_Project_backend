const express = require('express');
const router = express.Router();
const weeklyPlanController = require('../controllers/weeklyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);


router.post('/', weeklyPlanController.createWeeklyPlan);


router.get('/', weeklyPlanController.getAllWeeklyPlans);


router.get('/:id', weeklyPlanController.getWeeklyPlanById);


router.put('/:id', weeklyPlanController.updateWeeklyPlan);

router.delete('/:id', weeklyPlanController.deleteWeeklyPlan);

module.exports = router;
