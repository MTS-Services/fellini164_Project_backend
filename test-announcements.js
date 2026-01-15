// Test script for Announcement System
// Run with: node test-announcements.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Replace these with actual tokens from your system
const ADMIN_TOKEN = 'your-admin-token-here';
const USER_TOKEN = 'your-user-token-here';

const adminAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

const userAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${USER_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testAnnouncementSystem() {
  console.log('🚀 Testing Announcement System\n');

  try {
    // 1. Admin creates announcement
    console.log('📝 1. Creating announcement...');
    const createResponse = await adminAxios.post('/admin/announcements', {
      title: 'Welcome to the New Announcement System!',
      message: 'We are excited to introduce our new announcement system. Now admins can easily communicate with all users.',
      type: 'FEATURE',
      targetType: 'ALL_USERS',
      isPinned: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    });
    console.log('✅ Announcement created successfully!');
    console.log(`   Recipients: ${createResponse.data.data.recipientsCount}`);
    console.log(`   ID: ${createResponse.data.data.announcement.id}\n`);

    const announcementId = createResponse.data.data.announcement.id;

    // 2. Admin views all announcements
    console.log('📋 2. Fetching all announcements (admin view)...');
    const adminListResponse = await adminAxios.get('/admin/announcements?page=1&limit=10');
    console.log(`✅ Found ${adminListResponse.data.data.announcements.length} announcements`);
    if (adminListResponse.data.data.announcements.length > 0) {
      const first = adminListResponse.data.data.announcements[0];
      console.log(`   First: "${first.title}"`);
      console.log(`   Read rate: ${first.readPercentage}%\n`);
    }

    // 3. User gets unread count
    console.log('🔔 3. Getting unread count (user)...');
    const unreadCountResponse = await userAxios.get('/user/announcements/unread/count');
    console.log(`✅ Unread count: ${unreadCountResponse.data.data.unreadCount}\n`);

    // 4. User views announcements
    console.log('📱 4. Fetching user announcements...');
    const userListResponse = await userAxios.get('/user/announcements?page=1&limit=10');
    console.log(`✅ Found ${userListResponse.data.data.notifications.length} notifications`);
    console.log(`   Unread: ${userListResponse.data.data.unreadCount}\n`);

    if (userListResponse.data.data.notifications.length > 0) {
      const firstNotification = userListResponse.data.data.notifications[0];
      const notificationId = firstNotification.id;

      // 5. User marks announcement as read
      console.log('✓ 5. Marking announcement as read...');
      await userAxios.patch(`/user/announcements/${notificationId}/read`);
      console.log('✅ Announcement marked as read\n');

      // 6. Verify unread count decreased
      console.log('🔄 6. Verifying unread count...');
      const newUnreadCountResponse = await userAxios.get('/user/announcements/unread/count');
      console.log(`✅ New unread count: ${newUnreadCountResponse.data.data.unreadCount}\n`);
    }

    // 7. Create a targeted announcement
    console.log('🎯 7. Creating targeted announcement (FREE users only)...');
    const targetedResponse = await adminAxios.post('/admin/announcements', {
      title: 'Upgrade to Premium',
      message: 'Unlock advanced features with our premium plans!',
      type: 'PROMOTION',
      targetType: 'FREE_USERS',
      isPinned: false
    });
    console.log('✅ Targeted announcement created!');
    console.log(`   Recipients: ${targetedResponse.data.data.recipientsCount}\n`);

    // 8. Test delete announcement
    console.log('🗑️  8. Deleting test announcement...');
    await adminAxios.delete(`/admin/announcements/${announcementId}`);
    console.log('✅ Announcement deleted successfully\n');

    console.log('✨ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
testAnnouncementSystem();
