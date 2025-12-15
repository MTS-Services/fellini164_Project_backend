const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User routes
router.get('/:id', userController.getUserById);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// User settings routes
router.get('/:id/settings', userController.getUserSettings);
router.patch('/:id/settings', userController.updateUserSettings);

module.exports = router;
