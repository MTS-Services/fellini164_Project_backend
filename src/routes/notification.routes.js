const express = require('express');
const router = express.Router();

// Notification routes (TODO: Create controller)
router.get('/', (req, res) => {
  res.json({ message: 'Get notifications - TODO' });
});

router.patch('/:id/read', (req, res) => {
  res.json({ message: 'Mark notification as read - TODO' });
});

module.exports = router;
