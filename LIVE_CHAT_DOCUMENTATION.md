# Live Chat System - Complete Documentation

## 🎉 Implementation Complete!

A fully functional real-time chat system has been successfully integrated into your Fellini project. Users can now communicate with admin support in real-time with typing indicators, read receipts, and instant notifications.

---

## 📋 Table of Contents
1. [Features](#features)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Socket.io Events](#socketio-events)
5. [Usage Examples](#usage-examples)
6. [Testing Guide](#testing-guide)

---

## ✨ Features

### For Users:
- ✅ Start new chat sessions with admin support
- ✅ Send and receive messages in real-time
- ✅ View chat history
- ✅ See typing indicators when admin is typing
- ✅ Read receipts for messages
- ✅ Unread message counter
- ✅ Close chat sessions

### For Admins:
- ✅ View all chat rooms with pagination
- ✅ Assign chats to specific admins
- ✅ Real-time message notifications
- ✅ See unread messages from users
- ✅ Typing indicators
- ✅ Online/offline status for users

### Real-time Features:
- ✅ Instant message delivery via Socket.io
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Online/offline status
- ✅ Desktop notifications for new messages

---

## 🗄️ Database Schema

### ChatRoom Model
```prisma
model ChatRoom {
  id          String         @id @default(uuid())
  userId      String         // ID of the user
  adminId     String?        // ID of the assigned admin (optional)
  status      ChatRoomStatus @default(ACTIVE)
  subject     String?        // Optional subject line
  createdAt   DateTime       @default(now())
  closedAt    DateTime?      // When the chat was closed
  updatedAt   DateTime       @updatedAt
  
  messages    ChatMessage[]  // Related messages
  
  @@index([userId])
  @@index([adminId])
  @@index([status])
  @@map("chat_rooms")
}
```

### ChatMessage Model
```prisma
model ChatMessage {
  id          String      @id @default(uuid())
  chatRoomId  String      // ID of the chat room
  senderId    String      // ID of the sender (user or admin)
  message     String      @db.Text
  isFromAdmin Boolean     @default(false)
  isRead      Boolean     @default(false)
  createdAt   DateTime    @default(now())
  
  chatRoom    ChatRoom    @relation(fields: [chatRoomId], references: [id], onDelete: Cascade)
  
  @@index([chatRoomId])
  @@index([senderId])
  @@index([isRead])
  @@map("chat_messages")
}
```

### ChatRoomStatus Enum
```prisma
enum ChatRoomStatus {
  ACTIVE
  CLOSED
}
```

---

## 🔌 API Endpoints

### User Endpoints

#### 1. Start Chat Session
```http
POST /api/v1/chat/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Need help with subscription"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session started successfully",
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "adminId": null,
    "status": "ACTIVE",
    "subject": "Need help with subscription",
    "createdAt": "2026-01-15T03:43:06.000Z",
    "updatedAt": "2026-01-15T03:43:06.000Z"
  }
}
```

#### 2. Get My Chat Rooms
```http
GET /api/v1/chat/my-rooms
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "room-uuid",
      "userId": "user-uuid",
      "adminId": "admin-uuid",
      "status": "ACTIVE",
      "subject": "Subscription Help",
      "createdAt": "2026-01-15T03:43:06.000Z",
      "updatedAt": "2026-01-15T03:45:00.000Z",
      "messages": [
        {
          "id": "msg-uuid",
          "message": "Last message...",
          "createdAt": "2026-01-15T03:45:00.000Z"
        }
      ],
      "unreadCount": 2,
      "_count": {
        "messages": 15
      }
    }
  ]
}
```

#### 3. Get Unread Message Count
```http
GET /api/v1/chat/unread-count
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### Shared Endpoints (User & Admin)

#### 4. Get Chat Messages
```http
GET /api/v1/chat/:roomId/messages?page=1&limit=50
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid",
      "chatRoomId": "room-uuid",
      "senderId": "user-uuid",
      "message": "Hello, I need help",
      "isFromAdmin": false,
      "isRead": true,
      "createdAt": "2026-01-15T03:43:10.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 10,
    "limit": 50
  }
}
```

#### 5. Send Message
```http
POST /api/v1/chat/:roomId/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Hello, how can I help you?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "msg-uuid",
    "chatRoomId": "room-uuid",
    "senderId": "admin-uuid",
    "message": "Hello, how can I help you?",
    "isFromAdmin": true,
    "isRead": false,
    "createdAt": "2026-01-15T03:44:00.000Z"
  }
}
```

#### 6. Close Chat Session
```http
PATCH /api/v1/chat/:roomId/close
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session closed successfully",
  "data": {
    "id": "room-uuid",
    "status": "CLOSED",
    "closedAt": "2026-01-15T03:50:00.000Z"
  }
}
```

### Admin Endpoints

#### 7. Get All Chat Rooms (Admin)
```http
GET /api/v1/chat/rooms/all?page=1&limit=20&status=ACTIVE
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "room-uuid",
      "userId": "user-uuid",
      "adminId": "admin-uuid",
      "status": "ACTIVE",
      "subject": "Support Request",
      "createdAt": "2026-01-15T03:43:06.000Z",
      "updatedAt": "2026-01-15T03:45:00.000Z",
      "unreadCount": 3,
      "user": {
        "id": "user-uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "_count": {
        "messages": 20
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 20
  }
}
```

#### 8. Assign Chat to Admin
```http
PATCH /api/v1/chat/:roomId/assign
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "adminId": "admin-user-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat assigned successfully",
  "data": {
    "id": "room-uuid",
    "adminId": "admin-user-uuid",
    "updatedAt": "2026-01-15T03:46:00.000Z"
  }
}
```

---

## 🔌 Socket.io Events

### Client → Server Events

#### 1. Connect (Authentication)
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### 2. Join Room
```javascript
socket.emit('joinRoom', { roomId: 'room-uuid' });
```

#### 3. Leave Room
```javascript
socket.emit('leaveRoom', { roomId: 'room-uuid' });
```

#### 4. Send Message
```javascript
socket.emit('sendMessage', {
  roomId: 'room-uuid',
  message: 'Hello, this is a test message'
});
```

#### 5. Typing Indicator
```javascript
socket.emit('typing', { roomId: 'room-uuid' });
```

#### 6. Stop Typing
```javascript
socket.emit('stopTyping', { roomId: 'room-uuid' });
```

#### 7. Mark as Read
```javascript
socket.emit('markAsRead', { roomId: 'room-uuid' });
```

### Server → Client Events

#### 1. New Message
```javascript
socket.on('newMessage', (data) => {
  console.log('New message received:', data);
  // {
  //   id: 'msg-uuid',
  //   chatRoomId: 'room-uuid',
  //   senderId: 'user-uuid',
  //   senderName: 'John Doe',
  //   message: 'Hello',
  //   isFromAdmin: false,
  //   isRead: false,
  //   createdAt: '2026-01-15T03:43:10.000Z'
  // }
});
```

#### 2. New Message Notification
```javascript
socket.on('newMessageNotification', (data) => {
  console.log('New message notification:', data);
  // Show notification/badge
});
```

#### 3. User Typing
```javascript
socket.on('userTyping', (data) => {
  console.log(`${data.userName} is typing...`);
});
```

#### 4. User Stopped Typing
```javascript
socket.on('userStoppedTyping', (data) => {
  console.log('User stopped typing');
});
```

#### 5. Messages Read
```javascript
socket.on('messagesRead', (data) => {
  console.log('Messages marked as read:', data);
});
```

#### 6. User Status (Online/Offline)
```javascript
socket.on('userStatus', (data) => {
  console.log(`User ${data.userId} is ${data.isOnline ? 'online' : 'offline'}`);
});
```

#### 7. User Joined Room
```javascript
socket.on('userJoined', (data) => {
  console.log(`${data.userName} joined the chat`);
});
```

#### 8. User Left Room
```javascript
socket.on('userLeft', (data) => {
  console.log(`${data.userName} left the chat`);
});
```

#### 9. Error
```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

## 💻 Usage Examples

### Frontend Integration (React Example)

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatComponent({ token, roomId }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('joinRoom', { roomId });
    });

    newSocket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('userTyping', (data) => {
      setIsTyping(true);
    });

    newSocket.on('userStoppedTyping', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leaveRoom', { roomId });
      newSocket.disconnect();
    };
  }, [token, roomId]);

  // Send message
  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('sendMessage', {
        roomId,
        message: newMessage
      });
      setNewMessage('');
    }
  };

  // Typing indicator
  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { roomId });
      
      // Stop typing after 3 seconds
      setTimeout(() => {
        socket.emit('stopTyping', { roomId });
      }, 3000);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={msg.isFromAdmin ? 'admin-message' : 'user-message'}>
            <p>{msg.message}</p>
            <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        {isTyping && <p className="typing-indicator">Admin is typing...</p>}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyUp={handleTyping}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatComponent;
```

---

## 🧪 Testing Guide

### 1. Test with Postman

#### Step 1: Start a Chat Session
```
POST http://localhost:3000/api/v1/chat/start
Headers:
  Authorization: Bearer YOUR_USER_TOKEN
  Content-Type: application/json
Body:
{
  "subject": "Test Chat"
}
```

#### Step 2: Get Chat Rooms
```
GET http://localhost:3000/api/v1/chat/my-rooms
Headers:
  Authorization: Bearer YOUR_USER_TOKEN
```

#### Step 3: Send a Message
```
POST http://localhost:3000/api/v1/chat/{roomId}/message
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "message": "Hello, this is a test message"
}
```

### 2. Test Socket.io Connection

Create a simple HTML file to test Socket.io:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat Test</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Live Chat Test</h1>
  <div id="status"></div>
  <input type="text" id="token" placeholder="Enter JWT Token">
  <input type="text" id="roomId" placeholder="Enter Room ID">
  <button onclick="connect()">Connect</button>
  <br><br>
  <input type="text" id="message" placeholder="Type message">
  <button onclick="sendMessage()">Send</button>
  <div id="messages"></div>

  <script>
    let socket;

    function connect() {
      const token = document.getElementById('token').value;
      const roomId = document.getElementById('roomId').value;

      socket = io('http://localhost:3000', {
        auth: { token }
      });

      socket.on('connect', () => {
        document.getElementById('status').innerText = 'Connected!';
        socket.emit('joinRoom', { roomId });
      });

      socket.on('newMessage', (data) => {
        const div = document.createElement('div');
        div.innerText = `${data.senderName}: ${data.message}`;
        document.getElementById('messages').appendChild(div);
      });

      socket.on('userTyping', (data) => {
        console.log(data.userName + ' is typing...');
      });
    }

    function sendMessage() {
      const message = document.getElementById('message').value;
      const roomId = document.getElementById('roomId').value;
      
      socket.emit('sendMessage', { roomId, message });
      document.getElementById('message').value = '';
    }
  </script>
</body>
</html>
```

---

## 🚀 Start the Server

```bash
npm run dev
```

**Expected Output:**
```
Server is running on port 3000
Environment: development
Socket.io initialized and ready for connections
```

---

## 📝 Environment Variables

Make sure these are set in your `.env` file:

```env
PORT=3000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

---

## 🎯 Next Steps

1. **Frontend Integration**: Build a React/Vue/Angular chat interface
2. **Push Notifications**: Add mobile push notifications for new messages
3. **File Sharing**: Allow users to send images/files in chat
4. **Chat History Export**: Let users download chat transcripts
5. **Automated Responses**: Add chatbot for common questions
6. **Analytics Dashboard**: Track chat metrics (response time, satisfaction, etc.)

---

## 🐛 Troubleshooting

### Issue: Socket not connecting
- Verify JWT token is valid
- Check CORS settings in server.js
- Ensure Socket.io client version matches server version

### Issue: Messages not sending
- Verify user has access to the chat room
- Check database connection
- Review server logs for errors

### Issue: Typing indicators not working
- Ensure socket is properly connected
- Verify event names match exactly
- Check for JavaScript console errors

---

## 📞 Support

For issues or questions, please:
1. Check the troubleshooting section
2. Review the API documentation
3. Contact the development team

---

**🎉 Your live chat system is now fully operational!**
