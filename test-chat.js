/**
 * Live Chat System - Quick Test Script
 * Run this to verify chat endpoints are working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test configuration
const config = {
  userToken: 'YOUR_USER_JWT_TOKEN_HERE',
  adminToken: 'YOUR_ADMIN_JWT_TOKEN_HERE'
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers
    });

    console.log('✅ SUCCESS:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    throw error;
  }
}

// Test scenarios
async function runTests() {
  console.log('🧪 Starting Live Chat System Tests...\n');

  try {
    // Test 1: Start a chat session (User)
    console.log('📝 Test 1: Starting chat session...');
    const chatRoom = await apiCall('POST', '/chat/start', {
      subject: 'Test Chat Session'
    }, config.userToken);
    const roomId = chatRoom.data.id;
    console.log('Room ID:', roomId, '\n');

    // Test 2: Get user's chat rooms
    console.log('📝 Test 2: Getting user chat rooms...');
    await apiCall('GET', '/chat/my-rooms', null, config.userToken);
    console.log('\n');

    // Test 3: Send a message (User)
    console.log('📝 Test 3: Sending message as user...');
    await apiCall('POST', `/chat/${roomId}/message`, {
      message: 'Hello, I need help with my subscription'
    }, config.userToken);
    console.log('\n');

    // Test 4: Get chat messages
    console.log('📝 Test 4: Getting chat messages...');
    await apiCall('GET', `/chat/${roomId}/messages`, null, config.userToken);
    console.log('\n');

    // Test 5: Get all chat rooms (Admin)
    console.log('📝 Test 5: Getting all chat rooms (Admin)...');
    await apiCall('GET', '/chat/rooms/all?page=1&limit=10', null, config.adminToken);
    console.log('\n');

    // Test 6: Send message as admin
    console.log('📝 Test 6: Sending message as admin...');
    await apiCall('POST', `/chat/${roomId}/message`, {
      message: 'Hello! How can I help you today?'
    }, config.adminToken);
    console.log('\n');

    // Test 7: Assign chat to admin
    console.log('📝 Test 7: Assigning chat to admin...');
    // Note: You need to provide a valid admin user ID
    // await apiCall('PATCH', `/chat/${roomId}/assign`, {
    //   adminId: 'ADMIN_USER_ID_HERE'
    // }, config.adminToken);
    console.log('⚠️  Skipped (requires admin user ID)\n');

    // Test 8: Get unread count
    console.log('📝 Test 8: Getting unread message count...');
    await apiCall('GET', '/chat/unread-count', null, config.userToken);
    console.log('\n');

    // Test 9: Close chat session
    console.log('📝 Test 9: Closing chat session...');
    await apiCall('PATCH', `/chat/${roomId}/close`, null, config.userToken);
    console.log('\n');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Socket.io test example
function socketTestExample() {
  console.log('\n📡 Socket.io Connection Test Example:\n');
  console.log(`
const io = require('socket.io-client');

// Connect to socket server
const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected to socket server');
  
  // Join a chat room
  socket.emit('joinRoom', { roomId: 'YOUR_ROOM_ID' });
});

// Listen for new messages
socket.on('newMessage', (data) => {
  console.log('📨 New message:', data);
});

// Send a message
socket.emit('sendMessage', {
  roomId: 'YOUR_ROOM_ID',
  message: 'Hello from socket!'
});

// Listen for typing indicators
socket.on('userTyping', (data) => {
  console.log(\`⌨️  \${data.userName} is typing...\`);
});
  `);
}

// Instructions
console.log('='.repeat(60));
console.log('  LIVE CHAT SYSTEM - TEST SCRIPT');
console.log('='.repeat(60));
console.log('\n📋 SETUP INSTRUCTIONS:');
console.log('1. Make sure your server is running: npm run dev');
console.log('2. Update config.userToken with a valid user JWT token');
console.log('3. Update config.adminToken with a valid admin JWT token');
console.log('4. Run this script: node test-chat.js\n');
console.log('='.repeat(60));
console.log('\n');

// Check if tokens are configured
if (config.userToken === 'YOUR_USER_JWT_TOKEN_HERE' || 
    config.adminToken === 'YOUR_ADMIN_JWT_TOKEN_HERE') {
  console.log('⚠️  Please configure tokens in the script before running tests!\n');
  socketTestExample();
  process.exit(0);
}

// Run tests
runTests().catch(console.error);
