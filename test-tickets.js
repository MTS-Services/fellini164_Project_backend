/**
 * Ticket System Test File
 * 
 * This file contains examples for testing the ticket system API
 * Replace BASE_URL, USER_TOKEN, and ADMIN_TOKEN with your actual values
 */

const BASE_URL = 'http://localhost:3000/api/v1';
const USER_TOKEN = 'your-user-jwt-token-here';
const ADMIN_TOKEN = 'your-admin-jwt-token-here';

// ==================== USER TESTS ====================

/**
 * Test 1: User creates a new ticket
 */
async function testCreateTicket() {
  console.log('\n📝 Test 1: Creating a new ticket...');
  
  const response = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'AI keeps representing itself',
      message: 'When I ask the AI a question, it introduces itself instead of answering directly.',
      priority: 'HIGH'
    })
  });
  
  const data = await response.json();
  console.log('✅ Ticket created:', data);
  return data.ticket.id; // Return ticket ID for other tests
}

/**
 * Test 2: User gets all their tickets
 */
async function testGetUserTickets() {
  console.log('\n📋 Test 2: Getting user tickets...');
  
  const response = await fetch(`${BASE_URL}/tickets?page=1&limit=10`, {
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ User tickets:', data);
}

/**
 * Test 3: User views a specific ticket
 */
async function testGetTicketById(ticketId) {
  console.log('\n🔍 Test 3: Viewing ticket details...');
  
  const response = await fetch(`${BASE_URL}/tickets/${ticketId}`, {
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ Ticket details:', data);
}

/**
 * Test 4: User replies to a ticket
 */
async function testUserReply(ticketId) {
  console.log('\n💬 Test 4: User replying to ticket...');
  
  const response = await fetch(`${BASE_URL}/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Is there any update on this issue?'
    })
  });
  
  const data = await response.json();
  console.log('✅ Reply sent:', data);
}

/**
 * Test 5: User gets unread message count
 */
async function testGetUnreadCount() {
  console.log('\n🔔 Test 5: Getting unread count...');
  
  const response = await fetch(`${BASE_URL}/tickets/unread-count`, {
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ Unread count:', data);
}

/**
 * Test 6: User closes a ticket
 */
async function testCloseTicket(ticketId) {
  console.log('\n✖️ Test 6: Closing ticket...');
  
  const response = await fetch(`${BASE_URL}/tickets/${ticketId}/close`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ Ticket closed:', data);
}

// ==================== ADMIN TESTS ====================

/**
 * Test 7: Admin gets all tickets
 */
async function testAdminGetAllTickets() {
  console.log('\n👨‍💼 Test 7: Admin viewing all tickets...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets?status=OPEN&page=1&limit=10`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ All tickets:', data);
  return data.tickets[0]?.id; // Return first ticket ID for other tests
}

/**
 * Test 8: Admin views a specific ticket
 */
async function testAdminGetTicketById(ticketId) {
  console.log('\n🔍 Test 8: Admin viewing ticket details...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ Ticket details:', data);
}

/**
 * Test 9: Admin replies to a ticket
 */
async function testAdminReply(ticketId) {
  console.log('\n💬 Test 9: Admin replying to ticket...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Thank you for reporting this issue. Our team is investigating and will update you within 24 hours.'
    })
  });
  
  const data = await response.json();
  console.log('✅ Admin reply sent:', data);
}

/**
 * Test 10: Admin updates ticket status
 */
async function testUpdateTicketStatus(ticketId) {
  console.log('\n📊 Test 10: Updating ticket status...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'IN_PROGRESS'
    })
  });
  
  const data = await response.json();
  console.log('✅ Status updated:', data);
}

/**
 * Test 11: Admin updates ticket priority
 */
async function testUpdateTicketPriority(ticketId) {
  console.log('\n⚡ Test 11: Updating ticket priority...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}/priority`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priority: 'URGENT'
    })
  });
  
  const data = await response.json();
  console.log('✅ Priority updated:', data);
}

/**
 * Test 12: Admin assigns ticket
 */
async function testAssignTicket(ticketId) {
  console.log('\n👤 Test 12: Assigning ticket...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Leave empty to assign to current admin, or provide adminId
      // adminId: 'specific-admin-uuid'
    })
  });
  
  const data = await response.json();
  console.log('✅ Ticket assigned:', data);
}

/**
 * Test 13: Admin gets ticket statistics
 */
async function testGetTicketStats() {
  console.log('\n📈 Test 13: Getting ticket statistics...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/stats`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('✅ Statistics:', data);
}

/**
 * Test 14: Admin resolves ticket
 */
async function testResolveTicket(ticketId) {
  console.log('\n✅ Test 14: Resolving ticket...');
  
  const response = await fetch(`${BASE_URL}/admin/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'RESOLVED'
    })
  });
  
  const data = await response.json();
  console.log('✅ Ticket resolved:', data);
}

// ==================== RUN ALL TESTS ====================

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('🚀 Starting Ticket System Tests...\n');
  console.log('=' .repeat(60));
  
  try {
    // User creates a ticket
    const ticketId = await testCreateTicket();
    
    // User views their tickets
    await testGetUserTickets();
    
    // User views specific ticket
    if (ticketId) {
      await testGetTicketById(ticketId);
    }
    
    // Admin views all tickets
    const adminTicketId = await testAdminGetAllTickets();
    
    // Admin views specific ticket
    if (adminTicketId || ticketId) {
      await testAdminGetTicketById(adminTicketId || ticketId);
      
      // Admin replies to ticket
      await testAdminReply(adminTicketId || ticketId);
      
      // Admin updates priority
      await testUpdateTicketPriority(adminTicketId || ticketId);
      
      // Admin updates status
      await testUpdateTicketStatus(adminTicketId || ticketId);
      
      // Admin assigns ticket
      await testAssignTicket(adminTicketId || ticketId);
    }
    
    // User replies to ticket
    if (ticketId) {
      await testUserReply(ticketId);
    }
    
    // User checks unread count
    await testGetUnreadCount();
    
    // Admin gets statistics
    await testGetTicketStats();
    
    // Admin resolves ticket
    if (adminTicketId || ticketId) {
      await testResolveTicket(adminTicketId || ticketId);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during tests:', error.message);
    console.error(error);
  }
}

// ==================== QUICK TEST EXAMPLES ====================

/**
 * Quick test: Create a sample ticket
 */
async function quickCreateTicket() {
  const tickets = [
    {
      subject: 'AI keeps representing itself',
      message: 'The AI assistant introduces itself instead of answering my questions.',
      priority: 'HIGH'
    },
    {
      subject: 'Billing question',
      message: 'I was charged twice this month. Can you help?',
      priority: 'LOW'
    },
    {
      subject: 'Feature request: Dark Mode',
      message: 'Please add a dark mode option to the app.',
      priority: 'MEDIUM'
    }
  ];
  
  for (const ticket of tickets) {
    const response = await fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ticket)
    });
    
    const data = await response.json();
    console.log(`✅ Created ticket: ${data.ticket.ticketId} - ${ticket.subject}`);
  }
}

// ==================== EXPORT FUNCTIONS ====================

module.exports = {
  // User functions
  testCreateTicket,
  testGetUserTickets,
  testGetTicketById,
  testUserReply,
  testGetUnreadCount,
  testCloseTicket,
  
  // Admin functions
  testAdminGetAllTickets,
  testAdminGetTicketById,
  testAdminReply,
  testUpdateTicketStatus,
  testUpdateTicketPriority,
  testAssignTicket,
  testGetTicketStats,
  testResolveTicket,
  
  // Utility functions
  runAllTests,
  quickCreateTicket
};

// ==================== INSTRUCTIONS ====================
/*
To run these tests:

1. Start your server: npm start or npm run dev

2. Get authentication tokens:
   - Login as a user and copy the JWT token
   - Login as an admin and copy the JWT token

3. Update the constants at the top of this file:
   - BASE_URL (if different from localhost:3000)
   - USER_TOKEN
   - ADMIN_TOKEN

4. Run the tests:
   - Run all tests: node test-tickets.js
   - Or import specific functions in Node.js REPL or another test file

5. Check the console output for results

Example single test:
```
const { testCreateTicket } = require('./test-tickets');
testCreateTicket().then(console.log);
```

Example run all tests:
```
const { runAllTests } = require('./test-tickets');
runAllTests();
```

Or simply run: node test-tickets.js
*/

// Auto-run if executed directly
if (require.main === module) {
  console.log('⚠️  Remember to update USER_TOKEN and ADMIN_TOKEN before running!');
  console.log('');
  // Uncomment the line below to run all tests
  // runAllTests();
}
