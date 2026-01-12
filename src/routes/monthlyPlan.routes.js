const express = require('express');
const router = express.Router();
const monthlyPlanController = require('../controllers/monthlyPlanController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);


router.post('/', monthlyPlanController.createMonthlyPlan);


router.get('/', monthlyPlanController.getAllMonthlyPlans);


router.get('/:id', monthlyPlanController.getMonthlyPlanById);


router.put('/:id', monthlyPlanController.updateMonthlyPlan);


router.delete('/:id', monthlyPlanController.deleteMonthlyPlan);

module.exports = router;
