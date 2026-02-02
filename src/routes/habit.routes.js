const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const { protect } = require('../middleware/auth');

// Apply authentication to all routes
router.use(protect);

// Get all habits (with filters)
router.get('/', habitController.getAllHabits);


router.get('/:id', habitController.getHabitById);

router.post('/', habitController.createHabit);

router.patch('/:id', habitController.updateHabit);

router.delete('/:id', habitController.deleteHabit);

// Complete habit
router.post('/:id/complete', habitController.completeHabit);

router.post('/:id/skip', habitController.skipHabit);

router.get('/stats/overview', habitController.getHabitStats);

router.get('/:id/history', habitController.getHabitHistory);

// ==================== TEST EMAIL

router.post('/test/email', habitController.testHabitEmail);

module.exports = router;
