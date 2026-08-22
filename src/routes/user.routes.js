const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, userController.getDashboard);
router.get('/activity-logs', protect, userController.getMyActivityLogs);


router.post('/referrals/invite', protect, userController.sendReferralInvitation);
router.get('/referrals/invitations', protect, userController.getReferralInvitations);
router.get('/referrals/users', protect, userController.getReferredUsers);
router.get('/referrals/stats', protect, userController.getReferralStats);
router.get('/referrals/dashboard', protect, userController.getReferralDashboard);
router.get('/referrals/my-link', protect, userController.getMyReferralLink);
router.post('/referrals/email-link', protect, userController.emailMyReferralLink);


router.get('/:id', userController.getUserById);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);


router.get('/:id/settings', userController.getUserSettings);
router.patch('/:id/settings', userController.updateUserSettings);

module.exports = router;
