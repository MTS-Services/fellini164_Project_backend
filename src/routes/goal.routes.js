const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');

// Goal routes
router.get('/', goalController.getAllGoals);
router.get('/:id', goalController.getGoalById);
router.post('/', goalController.createGoal);
router.patch('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
