const express = require('express');
const router = express.Router();

// Feedback routes (TODO: Create controller)
router.post('/', (req, res) => {
  res.json({ message: 'Submit feedback - TODO' });
});

router.get('/', (req, res) => {
  res.json({ message: 'Get all feedback - TODO' });
});

router.post('/:id/upvote', (req, res) => {
  res.json({ message: 'Upvote feedback - TODO' });
});

module.exports = router;
