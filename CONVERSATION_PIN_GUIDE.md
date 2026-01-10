# Conversation Pinning Feature

## Overview
Users can now pin important conversations to keep them at the top of their conversation list for easy access.

## Database Changes
- Added `pinned` field (Boolean, default: false) to the `Conversation` model
- Added composite index on `[userId, pinned]` for optimized querying
- Migration: `20260110084242_add_pinned_to_conversations`

## API Endpoints

### 1. Pin a Conversation
```
POST /api/ai/conversations/:conversationId/pin
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Conversation pinned successfully",
  "data": {
    "id": "conversation-id",
    "title": "Conversation title",
    "pinned": true,
    ...
  }
}
```

### 2. Unpin a Conversation
```
DELETE /api/ai/conversations/:conversationId/pin
```
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Conversation unpinned successfully",
  "data": {
    "id": "conversation-id",
    "title": "Conversation title",
    "pinned": false,
    ...
  }
}
```

### 3. Toggle Pin Status
```
PATCH /api/ai/conversations/:conversationId/toggle-pin
```
**Authentication:** Required

**Description:** Toggles the current pin status (pinned → unpinned or unpinned → pinned)

**Response:**
```json
{
  "success": true,
  "message": "Conversation pinned successfully",
  "data": {
    "id": "conversation-id",
    "title": "Conversation title",
    "pinned": true,
    ...
  }
}
```

### 4. Get All Conversations (Updated)
```
GET /api/ai/conversations
```
**Authentication:** Required

**Query Parameters:**
- `type` (optional): Filter by conversation type
- `limit` (optional): Number of conversations to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      // Pinned conversations appear first, sorted by updatedAt
      // Then unpinned conversations, sorted by updatedAt
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

**Note:** Conversations are now automatically sorted with pinned conversations appearing first.

## Features Implemented

### Controller Methods
- `pinConversation`: Pin a conversation
- `unpinConversation`: Unpin a conversation
- `togglePinConversation`: Toggle pin status
- `getAllConversations`: Updated to sort pinned conversations first

### Security
- All endpoints verify conversation ownership
- Returns 403 Forbidden if user doesn't own the conversation
- Returns 404 Not Found if conversation doesn't exist

### Sorting Behavior
Conversations are sorted by:
1. **Pinned status** (pinned conversations first)
2. **Updated timestamp** (most recent first)

This means pinned conversations stay at the top, but within pinned/unpinned groups, the most recently updated conversations appear first.

## Example Usage

### Pin a conversation
```bash
curl -X POST http://localhost:3000/api/ai/conversations/abc-123/pin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Unpin a conversation
```bash
curl -X DELETE http://localhost:3000/api/ai/conversations/abc-123/pin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Toggle pin status
```bash
curl -X PATCH http://localhost:3000/api/ai/conversations/abc-123/toggle-pin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get all conversations (with pinned first)
```bash
curl -X GET http://localhost:3000/api/ai/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Integration Tips

1. **Display Pin Icon**: Show a pin icon next to pinned conversations in the list
2. **Quick Toggle**: Allow users to click the pin icon to toggle pin status
3. **Visual Separator**: Consider adding a visual separator between pinned and unpinned conversations
4. **Pin Limit**: Consider implementing a limit on the number of pinned conversations (optional)

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK`: Success
- `400 Bad Request`: Invalid request
- `403 Forbidden`: User doesn't own the conversation
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error
