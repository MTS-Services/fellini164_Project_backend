# Announcements System Documentation

## Overview
The announcements system allows admins to create and send announcements to users, and users to view and mark them as read. The system includes user targeting, read tracking, and notification management.

---

## Database Schema

### Announcement Model
```prisma
model Announcement {
  id                    String              @id @default(uuid())
  title                 String
  message               String              @db.Text
  type                  AnnouncementType    @default(INFO)
  targetType            TargetType          @default(ALL_USERS)
  targetPlans           SubscriptionPlan[]  @default([])
  status                AnnouncementStatus  @default(DRAFT)
  createdBy             String              // Admin ID
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  scheduledAt           DateTime?
  sentAt                DateTime?
  isActive              Boolean             @default(true)
  isPinned              Boolean             @default(false)
  expiresAt             DateTime?
  userNotifications     UserNotification[]
}
```

### UserNotification Model
```prisma
model UserNotification {
  id                    String       @id @default(uuid())
  userId                String
  announcementId        String
  isRead                Boolean      @default(false)
  readAt                DateTime?
  createdAt             DateTime     @default(now())
  announcement          Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
}
```

### Enums
```prisma
enum AnnouncementType {
  INFO
  UPDATE
  FEATURE
  MAINTENANCE
  PROMOTION
}

enum AnnouncementStatus {
  DRAFT
  SENT
}

enum TargetType {
  ALL_USERS
  FREE_USERS
  PAID_USERS
  SPECIFIC_PLAN
}
```

---

## API Endpoints

### Admin Endpoints

#### 1. Create and Send Announcement
**POST** `/api/v1/admin/announcements`

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Request Body:**
```json
{
  "title": "New Feature Release",
  "message": "We've launched a new AI planning feature!",
  "type": "FEATURE",
  "targetType": "ALL_USERS",
  "targetPlans": [],
  "isPinned": false,
  "scheduledAt": "2026-01-20T10:00:00Z",
  "expiresAt": "2026-02-15T00:00:00Z"
}
```

**Field Descriptions:**
- `scheduledAt` (optional): ISO 8601 datetime in UTC. If provided and time is in future, announcement will be scheduled (status=DRAFT). If omitted or time is past, announcement sends immediately (status=SENT).
- For Bangladesh timezone (UTC+6): Convert local time minus 6 hours. Example: 4:05 PM Bangladesh = 10:05 AM UTC.

**Response (Immediate Send):**
```json
{
  "success": true,
  "message": "Announcement created and sent to 150 users",
  "data": {
    "announcement": {
      "id": "uuid",
      "title": "New Feature Release",
      "message": "We've launched a new AI planning feature!",
      "type": "FEATURE",
      "status": "SENT",
      "sentAt": "2026-01-15T10:00:00Z",
      "createdBy": "admin-id"
    },
    "recipientsCount": 150,
    "scheduledRecipients": 0,
    "isScheduled": false
  }
}
```

**Response (Scheduled):**
```json
{
  "success": true,
  "message": "Announcement scheduled for 2026-01-20T10:00:00.000Z. Will be sent to 150 users.",
  "data": {
    "announcement": {
      "id": "uuid",
      "title": "New Feature Release",
      "message": "We've launched a new AI planning feature!",
      "type": "FEATURE",
      "status": "DRAFT",
      "scheduledAt": "2026-01-20T10:00:00.000Z",
      "sentAt": null,
      "createdBy": "admin-id"
    },
    "recipientsCount": 0,
    "scheduledRecipients": 150,
    "isScheduled": true
  }
}
```

#### 2. Get All Announcements (Admin View)
**GET** `/api/v1/admin/announcements`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (DRAFT, SENT)
- `type` - Filter by type (INFO, UPDATE, FEATURE, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "New Feature Release",
        "message": "Message content...",
        "type": "FEATURE",
        "status": "SENT",
        "recipientsCount": 150,
        "readCount": 120,
        "readPercentage": "80.00",
        "createdAt": "2026-01-15T10:00:00Z",
        "sentAt": "2026-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

#### 3. Delete Announcement
**DELETE** `/api/v1/admin/announcements/:id`

**Response:**
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```

---

### User Endpoints

#### 1. Get User Announcements
**GET** `/api/v1/user/announcements`

**Headers:**
```json
{
  "Authorization": "Bearer <user_token>"
}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `unreadOnly` - Filter unread only (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-id",
        "userId": "user-id",
        "announcementId": "announcement-id",
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-01-15T10:00:00Z",
        "announcement": {
          "id": "announcement-id",
          "title": "New Feature Release",
          "message": "We've launched a new AI planning feature!",
          "type": "FEATURE",
          "isPinned": false,
          "createdAt": "2026-01-15T10:00:00Z",
          "sentAt": "2026-01-15T10:00:00Z",
          "expiresAt": "2026-02-15T00:00:00Z"
        }
      }
    ],
    "unreadCount": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 25,
      "itemsPerPage": 20
    }
  }
}
```

#### 2. Get Unread Count
**GET** `/api/v1/user/announcements/unread/count`

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

#### 3. Mark Announcement as Read
**PATCH** `/api/v1/user/announcements/:id/read`

**Response:**
```json
{
  "success": true,
  "message": "Announcement marked as read",
  "data": {
    "id": "notification-id",
    "userId": "user-id",
    "announcementId": "announcement-id",
    "isRead": true,
    "readAt": "2026-01-15T11:00:00Z"
  }
}
```

#### 4. Mark All Announcements as Read
**PATCH** `/api/v1/user/announcements/read-all`

**Response:**
```json
{
  "success": true,
  "message": "Marked 5 announcements as read",
  "data": {
    "count": 5
  }
}
```

---

## Features

### 1. User Targeting
- **ALL_USERS** - Send to all active users
- **FREE_USERS** - Send to users on FREE plan
- **PAID_USERS** - Send to users on STARTER, PRO, or ULTIMATE plans
- **SPECIFIC_PLAN** - Send to users on specific subscription plans

### 2. Announcement Types
- **INFO** - General information
- **UPDATE** - Platform updates
- **FEATURE** - New feature announcements
- **MAINTENANCE** - Maintenance notifications
- **PROMOTION** - Promotional announcements

### 3. Announcement Features
- **Pinning** - Pin important announcements to the top
- **Expiration** - Set expiration dates for time-sensitive announcements
- **Scheduling** - Schedule announcements for future delivery
  - Set `scheduledAt` to future time → Announcement stays as DRAFT
  - Scheduler runs every minute and sends when time arrives
  - Status changes from DRAFT to SENT automatically
  - Users only see announcements after they're sent
- **Read Tracking** - Track which users have read announcements
- **Analytics** - View read counts and percentages

### 4. Cascade Deletion
When an announcement is deleted, all associated user notifications are automatically deleted.

---

## Usage Flow

### Admin Creates Announcement

1. **Admin Login** → Receives admin token
2. **Navigate to Admin Panel** → Click "Send Announcement" button
3. **Fill Form:**
   - Title
   - Message
   - Type (INFO, UPDATE, FEATURE, etc.)
   - Target Type (ALL_USERS, FREE_USERS, etc.)
   - Pin status
   - Expiration date (optional)

4. **Click "Send"** → Makes POST request to `/api/v1/admin/announcements`

5. **Backend Process:**
   ```
   ✓ Validates admin role
   ✓ Creates announcement record
   ✓ Finds target users based on targetType
   ✓ Creates UserNotification records for each user
   ✓ Returns success with recipient count
   ```

### User Views Announcements

1. **User Login** → Receives user token
2. **App requests unread count:**
   ```
   GET /api/v1/user/announcements/unread/count
   ```
   Display badge with count

3. **User opens announcements:**
   ```
   GET /api/v1/user/announcements
   ```
   Display list with pinned items first

4. **User clicks announcement:**
   - Display full message
   - Mark as read:
     ```
     PATCH /api/v1/user/announcements/:id/read
     ```
   - Update UI and decrement badge count

---

## Implementation Checklist

### Backend ✅
- [x] Update Prisma schema with Announcement and UserNotification models
- [x] Create announcement controller with admin and user functions
- [x] Create admin announcement routes
- [x] Create user announcement routes
- [x] Register routes in server
- [x] Run database migration
- [x] Implement scheduled announcements with cron scheduler
- [x] Create announcement scheduler service

### Frontend (To-Do)
- [ ] Create admin announcement form component
- [ ] Create admin announcements list view
- [ ] Add "Send Announcement" button to admin panel
- [ ] Create user announcements view
- [ ] Add notification badge in user nav
- [ ] Implement mark as read functionality
- [ ] Add announcement type icons
- [ ] Style pinned announcements differently

---

## Testing with Postman

### 1. Create Immediate Announcement (Admin)
```
POST http://localhost:3000/api/v1/admin/announcements
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "We will be performing system maintenance on Jan 20th from 2-4 AM UTC.",
  "type": "MAINTENANCE",
  "targetType": "ALL_USERS",
  "isPinned": true,
  "expiresAt": "2026-01-21T00:00:00Z"
}
```

### 2. Create Scheduled Announcement (Admin)
```
POST http://localhost:3000/api/v1/admin/announcements
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Weekend Update",
  "message": "Check out what's new this weekend!",
  "type": "UPDATE",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-20T10:00:00Z",
  "isPinned": false,
  "expiresAt": "2026-01-21T00:00:00Z"
}
```

**Bangladesh Time Example (4:05 PM = 10:05 AM UTC):**
```json
{
  "title": "Afternoon Reminder",
  "message": "Time to review your daily goals!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-15T10:05:00Z",
  "isPinned": false
}
```

### 3. Get Admin Announcements
```
GET http://localhost:3000/api/v1/admin/announcements?page=1&limit=10
Authorization: Bearer <admin_token>
```

### 4. Filter by Status
```
GET http://localhost:3000/api/v1/admin/announcements?status=DRAFT
GET http://localhost:3000/api/v1/admin/announcements?status=SENT
Authorization: Bearer <admin_token>
```

### 5. Get User Announcements
```
GET http://localhost:3000/api/v1/user/announcements?unreadOnly=true
Authorization: Bearer <user_token>
```

### 6. Mark as Read
```
PATCH http://localhost:3000/api/v1/user/announcements/<notification-id>/read
Authorization: Bearer <user_token>
```

---

## Best Practices

1. **Always target appropriately** - Use targetType to avoid spam
2. **Set expiration dates** - For time-sensitive announcements
3. **Use pinning sparingly** - Only for critical announcements
4. **Monitor read rates** - Check analytics to gauge engagement
5. **Delete outdated announcements** - Keep the system clean
6. **Use clear titles** - Make announcements scannable
7. **Keep messages concise** - Users prefer brief updates

---

## Error Handling

All endpoints return appropriate error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common error codes:
- **400** - Bad request (missing/invalid fields)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not found (announcement/notification doesn't exist)
- **500** - Server error

---

## Security Considerations

1. **Authentication Required** - All endpoints require valid JWT tokens
2. **Role-Based Access** - Admin endpoints check for ADMIN/SUPER_ADMIN roles
3. **User Isolation** - Users can only access their own notifications
4. **Input Validation** - All inputs are validated before processing
5. **Cascade Deletion** - Prevents orphaned notification records

---

## Future Enhancements

- [ ] Email notifications when announcement is sent
- [ ] Push notifications integration
- [ ] Announcement templates
- [ ] Edit draft announcements before they're sent
- [ ] Rich text editor support
- [ ] Attachment support
- [ ] User feedback/reactions to announcements
- [ ] A/B testing for announcements
- [ ] Analytics dashboard for announcement performance
- [ ] Pause/resume scheduled announcements
- [ ] Recurring announcements (daily/weekly)

---

## Scheduler Information

The announcement scheduler runs automatically when the server starts. It checks every minute for scheduled announcements that are ready to be sent.

**How it works:**
1. Server starts → Scheduler initializes
2. Every minute → Checks for DRAFT announcements where `scheduledAt <= now()`
3. For each ready announcement:
   - Finds target users
   - Creates UserNotification records
   - Updates status to SENT
   - Sets sentAt timestamp
4. Logs activity to console

**Configuration:**
- File: `src/services/announcementScheduler.js`
- Frequency: Every 1 minute
- Uses `cron` package
- Auto-starts with server

**Logs to watch:**
```
[AnnouncementScheduler] Started - checking every minute for scheduled announcements
[Scheduler] Found 2 announcements to send
[Scheduler] Sent announcement "Weekend Update" to 150 users
```

---

## Bangladesh Timezone Guide

For detailed information about scheduling announcements in Bangladesh timezone, see:
[SCHEDULED_ANNOUNCEMENTS_BANGLADESH.md](./SCHEDULED_ANNOUNCEMENTS_BANGLADESH.md)

**Quick Reference:**
- Bangladesh is UTC+6
- 4:05 PM Bangladesh = 10:05 AM UTC
- Always convert to UTC before sending to API
- Formula: `UTC = Bangladesh Time - 6 hours`
