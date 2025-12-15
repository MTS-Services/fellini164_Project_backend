const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');

// Habit routes
router.get('/', habitController.getAllHabits);
router.post('/', habitController.createHabit);
router.post('/:id/complete', habitController.completeHabit);
router.patch('/:id', habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);

module.exports = router;
