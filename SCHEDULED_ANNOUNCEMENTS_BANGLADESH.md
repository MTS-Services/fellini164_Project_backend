# Scheduled Announcements - Bangladesh Time Example

## How Scheduled Announcements Work

### Timeline Flow:

```
Admin creates announcement with scheduledAt → Saved as DRAFT → Scheduler checks every minute → When time arrives → Creates notifications for users → Users can see it
```

**Important:** Users **CANNOT** see scheduled announcements until the `scheduledAt` time arrives. The announcement stays in DRAFT status until then.

---

## Bangladesh Time Example

**Current Time:** 3:53 PM (Bangladesh Time - BST/UTC+6)
**Target Time:** 4:05 PM (Bangladesh Time)

### Step 1: Calculate UTC Time

Bangladesh is UTC+6, so:
- **3:53 PM BST** = **9:53 AM UTC**
- **4:05 PM BST** = **10:05 AM UTC**

### Step 2: Create Scheduled Announcement

**Endpoint:** `POST /api/v1/admin/announcements`

**Request:**
```json
{
  "title": "Afternoon Update",
  "message": "This announcement will appear at exactly 4:05 PM Bangladesh time!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "isPinned": false,
  "scheduledAt": "2026-01-15T10:05:00.000Z",
  "expiresAt": "2026-01-16T10:05:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Announcement scheduled for 2026-01-15T10:05:00.000Z. Will be sent to 150 users.",
  "data": {
    "announcement": {
      "id": "abc-123-xyz",
      "title": "Afternoon Update",
      "message": "This announcement will appear at exactly 4:05 PM Bangladesh time!",
      "status": "DRAFT",
      "scheduledAt": "2026-01-15T10:05:00.000Z",
      "sentAt": null,
      "createdBy": "admin-id"
    },
    "recipientsCount": 0,
    "scheduledRecipients": 150,
    "isScheduled": true
  }
}
```

### Step 3: What Happens Next

#### Before 4:05 PM (DRAFT Status)
- ✅ Admin can see the announcement in admin panel
- ✅ Shows as "DRAFT" status
- ❌ Users **CANNOT** see it yet
- ❌ No notifications created yet

#### At 4:05 PM (Scheduler Runs)
- ✅ Scheduler detects the time has arrived
- ✅ Finds all target users (150 users)
- ✅ Creates 150 `UserNotification` records
- ✅ Updates status from `DRAFT` to `SENT`
- ✅ Sets `sentAt` timestamp

#### After 4:05 PM (SENT Status)
- ✅ Users can now see the announcement
- ✅ Shows in their `/user/announcements` endpoint
- ✅ Appears in notification badge count

---

## Complete Example with Code

### JavaScript Example (Node.js)

```javascript
// Current time: 3:53 PM Bangladesh (9:53 AM UTC)
// Schedule for: 4:05 PM Bangladesh (10:05 AM UTC)

const axios = require('axios');

const ADMIN_TOKEN = 'your-admin-token';
const BASE_URL = 'http://localhost:3000/api/v1';

async function scheduleAnnouncement() {
  // Create a Date object for 4:05 PM Bangladesh time
  const bangladeshTime = new Date('2026-01-15T16:05:00+06:00');
  
  // OR manually create UTC time
  const utcTime = new Date('2026-01-15T10:05:00Z');
  
  console.log('Scheduling announcement for:', bangladeshTime.toISOString());
  // Output: 2026-01-15T10:05:00.000Z
  
  const response = await axios.post(
    `${BASE_URL}/admin/announcements`,
    {
      title: 'Afternoon Update',
      message: 'This will appear at 4:05 PM!',
      type: 'INFO',
      targetType: 'ALL_USERS',
      scheduledAt: bangladeshTime.toISOString(), // "2026-01-15T10:05:00.000Z"
      isPinned: false
    },
    {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('Scheduled:', response.data);
}

scheduleAnnouncement();
```

### Postman Example

**POST** `http://localhost:3000/api/v1/admin/announcements`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "title": "Evening Reminder",
  "message": "Don't forget to complete your daily tasks!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-15T10:05:00.000Z",
  "isPinned": false,
  "expiresAt": "2026-01-16T10:05:00.000Z"
}
```

---

## Different Scheduling Scenarios

### 1. Schedule for Tomorrow Morning (8:00 AM Bangladesh)

```json
{
  "title": "Good Morning!",
  "message": "Start your day with productivity!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-16T02:00:00.000Z"
}
```
*Note: 8:00 AM Bangladesh (UTC+6) = 2:00 AM UTC*

### 2. Schedule for Tonight (10:00 PM Bangladesh)

```json
{
  "title": "Evening Wrap-up",
  "message": "Review your day's achievements!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-15T16:00:00.000Z"
}
```
*Note: 10:00 PM Bangladesh (UTC+6) = 4:00 PM UTC*

### 3. Schedule for Next Week

```json
{
  "title": "Weekly Update",
  "message": "New features launching next week!",
  "type": "UPDATE",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-22T04:00:00.000Z",
  "expiresAt": "2026-01-29T04:00:00.000Z"
}
```

---

## Time Conversion Helper

### Quick Reference for Bangladesh (UTC+6)

| Bangladesh Time | UTC Time | ISO String Format |
|----------------|----------|-------------------|
| 12:00 AM (Midnight) | 6:00 PM (Previous Day) | YYYY-MM-DDT18:00:00.000Z |
| 6:00 AM | 12:00 AM (Midnight UTC) | YYYY-MM-DDT00:00:00.000Z |
| 12:00 PM (Noon) | 6:00 AM | YYYY-MM-DDT06:00:00.000Z |
| 4:05 PM | 10:05 AM | YYYY-MM-DDT10:05:00.000Z |
| 6:00 PM | 12:00 PM (Noon UTC) | YYYY-MM-DDT12:00:00.000Z |
| 11:59 PM | 5:59 PM | YYYY-MM-DDT17:59:00.000Z |

### Conversion Formula

```
UTC Time = Bangladesh Time - 6 hours
Bangladesh Time = UTC Time + 6 hours
```

---

## How to Convert Bangladesh Time to UTC

### Method 1: Using JavaScript

```javascript
// Create date in Bangladesh timezone
const bdTime = new Date('2026-01-15T16:05:00+06:00');
console.log(bdTime.toISOString());
// Output: 2026-01-15T10:05:00.000Z

// OR manually subtract 6 hours
const bdHour = 16; // 4 PM
const bdMinute = 5;
const utcHour = bdHour - 6; // 10 AM UTC
```

### Method 2: Using Online Tools

1. Visit: https://www.timeanddate.com/worldclock/converter.html
2. Enter "Bangladesh" as source timezone
3. Enter your target time (4:05 PM)
4. Select "UTC" as destination
5. Result: 10:05 AM UTC

### Method 3: Manual Calculation

```
Bangladesh Time: 4:05 PM
Subtract 6 hours: 4:05 PM - 6 hours = 10:05 AM
Result: 10:05 AM UTC
```

---

## Testing Scheduled Announcements

### Test Script

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_TOKEN = 'your-admin-token';
const USER_TOKEN = 'your-user-token';

async function testScheduledAnnouncement() {
  // 1. Create scheduled announcement (for 2 minutes from now)
  const scheduledTime = new Date();
  scheduledTime.setMinutes(scheduledTime.getMinutes() + 2);
  
  console.log('Creating announcement scheduled for:', scheduledTime.toISOString());
  
  const createResponse = await axios.post(
    `${BASE_URL}/admin/announcements`,
    {
      title: 'Test Scheduled Announcement',
      message: 'This should appear in 2 minutes!',
      type: 'INFO',
      targetType: 'ALL_USERS',
      scheduledAt: scheduledTime.toISOString()
    },
    {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    }
  );
  
  console.log('✅ Announcement created:', createResponse.data);
  
  // 2. Check user announcements (should be empty initially)
  console.log('\n📱 Checking user announcements (should be 0 initially)...');
  const beforeResponse = await axios.get(
    `${BASE_URL}/user/announcements`,
    {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    }
  );
  console.log('User notifications count:', beforeResponse.data.data.notifications.length);
  
  // 3. Wait for 2 minutes + 10 seconds
  console.log('\n⏳ Waiting 2 minutes for scheduler to process...');
  await new Promise(resolve => setTimeout(resolve, 130000)); // 2 min 10 sec
  
  // 4. Check again (should now appear)
  console.log('\n📱 Checking user announcements (should appear now)...');
  const afterResponse = await axios.get(
    `${BASE_URL}/user/announcements`,
    {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    }
  );
  console.log('User notifications count:', afterResponse.data.data.notifications.length);
  console.log('✅ Test complete!');
}

testScheduledAnnouncement();
```

---

## Checking Scheduler Status

### View Scheduler Logs

The scheduler runs every minute and logs activity:

```bash
# Start your server
npm run dev

# Look for these logs:
[AnnouncementScheduler] Started - checking every minute for scheduled announcements
[Scheduler] Found 1 announcements to send
[Scheduler] Sent announcement "Afternoon Update" to 150 users
```

### Verify in Admin Panel

**GET** `/api/v1/admin/announcements?status=DRAFT`

See all scheduled announcements waiting to be sent.

**GET** `/api/v1/admin/announcements?status=SENT`

See all announcements that have been sent.

---

## Important Notes

1. **Scheduler Precision:** Announcements are checked every 1 minute. An announcement scheduled for 4:05:00 PM will be sent between 4:05:00 PM and 4:05:59 PM.

2. **Server Time:** Make sure your server's system time is correct. Check with:
   ```bash
   date
   ```

3. **Timezone Storage:** All times are stored as UTC in the database. Always convert local time to UTC before sending.

4. **Past Times:** If you try to schedule an announcement for a time that has already passed, it will be sent immediately.

5. **User Visibility:** Users will ONLY see announcements after they are sent (status = SENT). Draft announcements are hidden from users.

---

## FAQ

**Q: If I schedule for 4:05 PM, when exactly will users see it?**
A: Users will see it within 1 minute after 4:05 PM (between 4:05-4:06 PM) when the scheduler runs.

**Q: Can I schedule an announcement for immediate delivery?**
A: Yes, just don't include `scheduledAt` or set it to null/current time. It will be sent immediately.

**Q: Can I cancel a scheduled announcement?**
A: Yes, use the DELETE endpoint before it's sent. Once sent, you can only delete it (which removes it from all users).

**Q: What if my server restarts before a scheduled announcement is sent?**
A: The scheduler will start again when the server restarts and will process any pending scheduled announcements.

**Q: Can I see scheduled announcements in the admin panel?**
A: Yes, filter by `status=DRAFT` to see all scheduled announcements.
