# Quick Reference: Schedule Announcement at 4:05 PM Bangladesh Time

## Current Situation
- **Current Time:** 3:53 PM Bangladesh Time
- **Target Time:** 4:05 PM Bangladesh Time
- **Timezone:** Bangladesh Standard Time (BST) = UTC+6

## Quick Steps

### 1. Calculate UTC Time
```
Bangladesh Time: 4:05 PM = 16:05
Convert to UTC: 16:05 - 6 hours = 10:05 AM UTC
```

### 2. API Call (Postman/cURL)

**Endpoint:** `POST http://localhost:3000/api/v1/admin/announcements`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Afternoon Update",
  "message": "This will appear at exactly 4:05 PM!",
  "type": "INFO",
  "targetType": "ALL_USERS",
  "scheduledAt": "2026-01-15T10:05:00.000Z",
  "isPinned": false
}
```

### 3. What Happens

**Now (3:53 PM):**
- ✅ Announcement created with status = `DRAFT`
- ❌ Users cannot see it yet
- ✅ Visible in admin panel

**At 4:05 PM:**
- ✅ Scheduler automatically sends it
- ✅ Status changes to `SENT`
- ✅ 150 UserNotifications created
- ✅ Users can now see it

**After 4:05 PM:**
- ✅ Appears in `/user/announcements`
- ✅ Shows in notification badge
- ✅ Users can read and mark as read

## JavaScript Code Example

```javascript
const axios = require('axios');

// For 4:05 PM Bangladesh today
const scheduledTime = new Date('2026-01-15T16:05:00+06:00');

// OR create manually
const now = new Date();
now.setHours(16, 5, 0, 0); // 4:05 PM
const utcTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // Subtract 6 hours

axios.post('http://localhost:3000/api/v1/admin/announcements', {
  title: 'Afternoon Update',
  message: 'This will appear at 4:05 PM!',
  type: 'INFO',
  targetType: 'ALL_USERS',
  scheduledAt: scheduledTime.toISOString()
}, {
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  }
});
```

## Common Bangladesh Times → UTC

| Bangladesh Time | UTC Time | ISO String |
|----------------|----------|------------|
| 8:00 AM | 2:00 AM | `2026-01-15T02:00:00.000Z` |
| 12:00 PM | 6:00 AM | `2026-01-15T06:00:00.000Z` |
| 4:05 PM | 10:05 AM | `2026-01-15T10:05:00.000Z` |
| 6:00 PM | 12:00 PM | `2026-01-15T12:00:00.000Z` |
| 10:00 PM | 4:00 PM | `2026-01-15T16:00:00.000Z` |

## Verification

**Check scheduled announcements:**
```bash
GET /api/v1/admin/announcements?status=DRAFT
```

**Watch server logs:**
```bash
npm run dev
# Look for:
# [AnnouncementScheduler] Started - checking every minute
# [Scheduler] Sent announcement "..." to 150 users
```

## Troubleshooting

**Problem:** Announcement sent immediately instead of scheduling
- **Cause:** scheduledAt time is in the past or incorrectly formatted
- **Fix:** Ensure time is in future and in UTC format

**Problem:** Announcement not appearing for users
- **Cause:** Still in DRAFT status (time hasn't arrived yet)
- **Fix:** Wait until scheduled time, or check server logs

**Problem:** Scheduler not running
- **Cause:** Server not started or crashed
- **Fix:** Restart server with `npm run dev`

---

**Need more details?** See [SCHEDULED_ANNOUNCEMENTS_BANGLADESH.md](./SCHEDULED_ANNOUNCEMENTS_BANGLADESH.md)
