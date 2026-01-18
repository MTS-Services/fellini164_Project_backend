# Ticket System Documentation

A complete ticket system for user-admin communication, allowing users to create support tickets and admins to manage and respond to them.

## Features

### User Side
- Create new support tickets
- View all their tickets
- View individual ticket details with full conversation
- Reply to tickets
- Close their own tickets
- Get unread message count

### Admin Side
- View all tickets with filtering and pagination
- View detailed ticket information
- Reply to tickets
- Update ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- Update ticket priority (LOW, MEDIUM, HIGH, URGENT)
- Assign tickets to admin users
- View ticket statistics
- Delete tickets

## Database Schema

### Ticket Model
```prisma
model Ticket {
  id          String         @id @default(uuid())
  ticketId    String         @unique // Format: TXT-001, TXT-002, etc.
  userId      String
  subject     String
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  assignedTo  String?        // Admin user ID
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  closedAt    DateTime?
  
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    TicketMessage[]
}
```

### TicketMessage Model
```prisma
model TicketMessage {
  id          String   @id @default(uuid())
  ticketId    String
  senderId    String
  message     String   @db.Text
  isFromAdmin Boolean  @default(false)
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
}
```

### Enums
```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

## API Endpoints

### User Endpoints

#### 1. Create Ticket
```
POST /api/v1/tickets
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "subject": "AI keeps representing itself",
  "message": "The AI assistant is introducing itself in conversations",
  "priority": "HIGH" // Optional: LOW, MEDIUM, HIGH, URGENT
}

Response:
{
  "success": true,
  "message": "Ticket created successfully",
  "ticket": {
    "id": "uuid",
    "ticketId": "TXT-001",
    "userId": "user-uuid",
    "subject": "AI keeps representing itself",
    "status": "OPEN",
    "priority": "HIGH",
    "createdAt": "2026-01-18T03:50:00.000Z",
    "user": {
      "id": "user-uuid",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "messages": [...]
  }
}
```

#### 2. Get User's Tickets
```
GET /api/v1/tickets?status=OPEN&priority=HIGH&page=1&limit=10
Authorization: Bearer {token}

Query Parameters:
- status (optional): OPEN, IN_PROGRESS, RESOLVED, CLOSED
- priority (optional): LOW, MEDIUM, HIGH, URGENT
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 10)

Response:
{
  "success": true,
  "tickets": [
    {
      "id": "uuid",
      "ticketId": "TXT-001",
      "subject": "Billing question",
      "status": "OPEN",
      "priority": "LOW",
      "createdAt": "2026-01-18T03:50:00.000Z",
      "messages": [...], // Last message only
      "_count": {
        "messages": 3
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

#### 3. Get Single Ticket
```
GET /api/v1/tickets/:ticketId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticketId": "TXT-001",
    "subject": "AI keeps representing itself",
    "status": "OPEN",
    "priority": "HIGH",
    "createdAt": "2026-01-18T03:50:00.000Z",
    "user": {
      "id": "user-uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "avatar": null
    },
    "messages": [
      {
        "id": "msg-uuid",
        "senderId": "user-uuid",
        "message": "The AI assistant is introducing itself",
        "isFromAdmin": false,
        "isRead": true,
        "createdAt": "2026-01-18T03:50:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "senderId": "admin-uuid",
        "message": "Thank you for reporting this. We'll look into it.",
        "isFromAdmin": true,
        "isRead": true,
        "createdAt": "2026-01-18T04:00:00.000Z"
      }
    ]
  }
}
```

#### 4. Reply to Ticket
```
POST /api/v1/tickets/:ticketId/reply
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "message": "It's still happening. Can you help?"
}

Response:
{
  "success": true,
  "message": "Reply sent successfully",
  "ticketMessage": {...},
  "ticket": {...}
}
```

#### 5. Close Ticket
```
PATCH /api/v1/tickets/:ticketId/close
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Ticket closed successfully",
  "ticket": {
    "id": "uuid",
    "status": "CLOSED",
    "closedAt": "2026-01-18T05:00:00.000Z",
    ...
  }
}
```

#### 6. Get Unread Count
```
GET /api/v1/tickets/unread-count
Authorization: Bearer {token}

Response:
{
  "success": true,
  "unreadCount": 3
}
```

---

### Admin Endpoints

#### 1. Get All Tickets (Admin)
```
GET /api/v1/admin/tickets?status=OPEN&priority=HIGH&search=john&page=1&limit=10&sortBy=createdAt&order=desc
Authorization: Bearer {admin-token}

Query Parameters:
- status (optional): OPEN, IN_PROGRESS, RESOLVED, CLOSED
- priority (optional): LOW, MEDIUM, HIGH, URGENT
- search (optional): Search in ticketId, subject, user email, user name
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 10)
- sortBy (optional): Field to sort by (default: createdAt)
- order (optional): asc or desc (default: desc)

Response:
{
  "success": true,
  "tickets": [
    {
      "id": "uuid",
      "ticketId": "TXT-001",
      "subject": "AI keeps representing itself",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2026-01-18T03:50:00.000Z",
      "user": {
        "id": "user-uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "avatar": null
      },
      "messages": [...], // Last message
      "_count": {
        "messages": 5
      }
    }
  ],
  "statistics": {
    "open": 10,
    "in_progress": 5,
    "resolved": 20,
    "closed": 15
  },
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### 2. Get Single Ticket (Admin)
```
GET /api/v1/admin/tickets/:ticketId
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticketId": "TXT-001",
    "subject": "AI keeps representing itself",
    "status": "OPEN",
    "priority": "HIGH",
    "assignedTo": null,
    "createdAt": "2026-01-18T03:50:00.000Z",
    "user": {
      "id": "user-uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "avatar": null,
      "phone": "+1234567890",
      "subscriptionPlan": "PRO"
    },
    "messages": [...]
  }
}
```

#### 3. Reply to Ticket (Admin)
```
POST /api/v1/admin/tickets/:ticketId/reply
Authorization: Bearer {admin-token}
Content-Type: application/json

Body:
{
  "message": "Thank you for reporting this issue. We are investigating it and will update you soon."
}

Response:
{
  "success": true,
  "message": "Reply sent successfully",
  "ticketMessage": {...},
  "ticket": {
    "status": "IN_PROGRESS", // Automatically set to IN_PROGRESS
    "assignedTo": "admin-uuid", // Automatically assigned if not already
    ...
  }
}
```

#### 4. Update Ticket Status
```
PATCH /api/v1/admin/tickets/:ticketId/status
Authorization: Bearer {admin-token}
Content-Type: application/json

Body:
{
  "status": "RESOLVED" // OPEN, IN_PROGRESS, RESOLVED, CLOSED
}

Response:
{
  "success": true,
  "message": "Ticket status updated successfully",
  "ticket": {...}
}
```

#### 5. Update Ticket Priority
```
PATCH /api/v1/admin/tickets/:ticketId/priority
Authorization: Bearer {admin-token}
Content-Type: application/json

Body:
{
  "priority": "URGENT" // LOW, MEDIUM, HIGH, URGENT
}

Response:
{
  "success": true,
  "message": "Ticket priority updated successfully",
  "ticket": {...}
}
```

#### 6. Assign Ticket to Admin
```
PATCH /api/v1/admin/tickets/:ticketId/assign
Authorization: Bearer {admin-token}
Content-Type: application/json

Body:
{
  "adminId": "admin-uuid" // Optional, if not provided, assigns to current admin
}

Response:
{
  "success": true,
  "message": "Ticket assigned successfully",
  "ticket": {
    "assignedTo": "admin-uuid",
    "status": "IN_PROGRESS",
    ...
  }
}
```

#### 7. Get Ticket Statistics
```
GET /api/v1/admin/tickets/stats
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "statistics": {
    "total": 50,
    "open": 10,
    "inProgress": 5,
    "resolved": 20,
    "closed": 15,
    "highPriority": 8,
    "avgResponseTimeMinutes": 45
  }
}
```

#### 8. Delete Ticket
```
DELETE /api/v1/admin/tickets/:ticketId
Authorization: Bearer {admin-token}

Response:
{
  "success": true,
  "message": "Ticket deleted successfully"
}
```

## Status Flow

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
  ↓         ↓           ↓
  ←─────────←───────────← (Can reopen)
```

- **OPEN**: New ticket created by user
- **IN_PROGRESS**: Admin has replied or assigned the ticket
- **RESOLVED**: Issue is resolved, waiting for user confirmation
- **CLOSED**: Ticket is closed (by user or admin)

## Priority Levels

- **LOW**: General inquiries, non-urgent issues
- **MEDIUM**: Standard support requests (default)
- **HIGH**: Important issues affecting user experience
- **URGENT**: Critical issues requiring immediate attention

## Usage Examples

### Example 1: User Creates a Ticket
```javascript
// User creates a ticket
const response = await fetch('http://localhost:3000/api/v1/tickets', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer user-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subject: 'Feature request: Dark Mode',
    message: 'I would love to have a dark mode option in the app.',
    priority: 'MEDIUM'
  })
});

const data = await response.json();
console.log('Ticket created:', data.ticket.ticketId); // TXT-005
```

### Example 2: Admin Views and Replies
```javascript
// Admin views all open tickets
const tickets = await fetch('http://localhost:3000/api/v1/admin/tickets?status=OPEN', {
  headers: { 'Authorization': 'Bearer admin-token' }
});

// Admin replies to a ticket
const reply = await fetch(`http://localhost:3000/api/v1/admin/tickets/${ticketId}/reply`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Thank you for your suggestion! We are planning to add dark mode in our next release.'
  })
});

// Admin updates status to resolved
await fetch(`http://localhost:3000/api/v1/admin/tickets/${ticketId}/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'RESOLVED'
  })
});
```

### Example 3: User Checks Their Tickets
```javascript
// Get all user tickets
const myTickets = await fetch('http://localhost:3000/api/v1/tickets', {
  headers: { 'Authorization': 'Bearer user-token' }
});

// Get unread message count
const unread = await fetch('http://localhost:3000/api/v1/tickets/unread-count', {
  headers: { 'Authorization': 'Bearer user-token' }
});

// View specific ticket with all messages
const ticket = await fetch(`http://localhost:3000/api/v1/tickets/${ticketId}`, {
  headers: { 'Authorization': 'Bearer user-token' }
});
```

## Implementation Notes

### Automatic Ticket ID Generation
The system automatically generates unique ticket IDs in the format `TXT-001`, `TXT-002`, etc. This is handled by the `generateTicketId()` function in the controller.

### Read Status
- When a user views a ticket, all unread admin messages are marked as read
- When an admin views a ticket, all unread user messages are marked as read
- This helps both parties track which messages have been seen

### Auto-Assignment
When an admin replies to a ticket for the first time, the ticket is automatically:
- Assigned to that admin (if not already assigned)
- Status changed to IN_PROGRESS

### Reopening Tickets
If a user replies to a RESOLVED ticket, the status automatically changes back to OPEN, indicating the issue needs more attention.

## Security Considerations

1. **Authentication**: All endpoints require valid JWT authentication
2. **Authorization**: Users can only access their own tickets
3. **Admin Role**: Admin endpoints require ADMIN or SUPER_ADMIN role
4. **Data Validation**: All inputs are validated before processing
5. **Cascade Delete**: When a user is deleted, their tickets are also deleted

## Frontend Integration Tips

### Displaying Ticket List (Admin)
```javascript
// Color coding for priority
const priorityColors = {
  LOW: 'green',
  MEDIUM: 'orange',
  HIGH: 'red',
  URGENT: 'darkred'
};

// Badge colors for status
const statusColors = {
  OPEN: 'blue',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray'
};
```

### Real-time Updates (Future Enhancement)
Consider integrating Socket.io for real-time notifications when:
- A new ticket is created
- A ticket receives a new message
- Ticket status changes

## Testing with Postman

Import the following collection to test all endpoints:

1. Create a new collection
2. Add environment variables:
   - `base_url`: http://localhost:3000/api/v1
   - `user_token`: Your user JWT token
   - `admin_token`: Your admin JWT token
3. Test each endpoint systematically

## Future Enhancements

- [ ] Add file attachments support
- [ ] Email notifications on ticket updates
- [ ] Real-time chat via Socket.io
- [ ] Ticket categories/departments
- [ ] SLA tracking
- [ ] Canned responses for admins
- [ ] Ticket templates
- [ ] Customer satisfaction ratings
- [ ] Ticket archiving
- [ ] Advanced reporting and analytics
