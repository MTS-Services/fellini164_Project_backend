const express = require('express');
const router = express.Router();

// Support routes (TODO: Create controller)
router.post('/conversations', (req, res) => {
  res.json({ message: 'Create support conversation - TODO' });
});

router.get('/conversations', (req, res) => {
  res.json({ message: 'Get support conversations - TODO' });
});

router.post('/conversations/:id/messages', (req, res) => {
  res.json({ message: 'Add message to conversation - TODO' });
});

router.post('/ai-help', (req, res) => {
  res.json({ message: 'AI support assistant - TODO' });
});

module.exports = router;
