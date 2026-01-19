# Task System - Complete Implementation Guide

## Overview

The Task System is a comprehensive, AI-powered task management solution that enables users to create, manage, track, and optimize their tasks. It combines manual task creation with intelligent AI-generated tasks based on user goals, habits, and behavior patterns.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [AI Features](#ai-features)
5. [Analytics & Insights](#analytics--insights)
6. [Notification System](#notification-system)
7. [Usage Examples](#usage-examples)
8. [Workflow Diagrams](#workflow-diagrams)

---

## Architecture

### Components

```
Task System
├── Database Layer (Prisma Schema)
│   └── Task Model with comprehensive fields
├── Service Layer
│   ├── taskService.js - CRUD & business logic
│   ├── openaiService.js - AI task generation
│   ├── taskAnalyticsService.js - Analytics & insights
│   └── taskNotificationService.js - Reminders & alerts
├── Controller Layer
│   └── taskController.js - Request handling
└── Routes Layer
    └── task.routes.js - API endpoints
```

### Key Features

✅ **Manual & AI-Generated Tasks**
- Users can create tasks manually
- AI generates tasks from goals, habits, and plans
- AI breaks down complex tasks into subtasks

✅ **Smart Tracking**
- Completion tracking with timestamps
- Skip tracking with reasons
- Time estimation vs actual time
- Streak tracking for recurring tasks

✅ **Adaptive AI**
- Learns from user behavior
- Adjusts task difficulty and priorities
- Detects productivity patterns
- Provides personalized recommendations

✅ **Magic Sync Feature**
- One-click task rebalancing
- Intelligent rescheduling
- Priority-based reorganization

✅ **Comprehensive Analytics**
- Completion rates by category/priority
- Productivity hour analysis
- Time estimation accuracy
- Streak analytics
- AI vs manual task comparison

✅ **Notification System**
- Daily task reminders
- Deadline alerts
- Overdue notifications
- Completion congratulations
- Streak milestones

---

## Database Schema

### Task Model

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELED
  SKIPPED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskSource {
  AI_GENERATED
  MANUAL
  FROM_GOAL
  FROM_HABIT
  FROM_PLAN
}

model Task {
  id                    String       @id @default(uuid())
  userId                String
  
  // Basic Info
  title                 String
  description           String?
  status                TaskStatus   @default(TODO)
  priority              TaskPriority @default(MEDIUM)
  
  // Time Management
  dueDate               DateTime?
  dueTime               String?
  estimatedMinutes      Int?
  actualMinutes         Int?
  scheduledDate         DateTime?
  
  // Categorization
  category              GoalCategory?
  tags                  String[]
  
  // AI & Source Tracking
  aiGenerated           Boolean      @default(false)
  source                TaskSource   @default(MANUAL)
  aiRecommendation      String?
  difficultyLevel       Int?         @default(5)
  
  // Relationships
  parentTaskId          String?
  goalId                String?
  habitId               String?
  dailyPlanId           String?
  weeklyPlanId          String?
  monthlyPlanId         String?
  
  // Progress Tracking
  completionRate        Float        @default(0)
  skipCount             Int          @default(0)
  skipReasons           String[]
  
  // Adaptation
  originalEstimate      Int?
  aiAdjusted            Boolean      @default(false)
  adjustmentReason      String?
  
  // Recurrence
  isRecurring           Boolean      @default(false)
  recurrencePattern     String?
  recurrenceDays        String[]
  
  // Streak & Engagement
  currentStreak         Int          @default(0)
  completionCount       Int          @default(0)
  
  // Context
  notes                 String?
  energyLevelRequired   String?
  contextNeeded         String?
  
  // Timestamps
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  completedAt           DateTime?
  startedAt             DateTime?
  canceledAt            DateTime?
  
  // Relations
  user                  User         @relation(...)
  parentTask            Task?        @relation("TaskSubtasks", ...)
  subtasks              Task[]       @relation("TaskSubtasks")
}
```

---

## API Endpoints

### Authentication Required

All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

### Basic CRUD Operations

#### 1. Get All Tasks (with filtering)
```http
GET /api/v1/tasks?status=TODO&priority=HIGH&category=HEALTH&today=true
```

**Query Parameters:**
- `status` - TODO, IN_PROGRESS, COMPLETED, CANCELED, SKIPPED
- `priority` - LOW, MEDIUM, HIGH, URGENT
- `category` - HEALTH, FITNESS, HABITS, MONEY, CAREER, etc.
- `source` - AI_GENERATED, MANUAL, FROM_GOAL, FROM_HABIT, FROM_PLAN
- `today` - boolean (true for today's tasks)
- `startDate` - ISO date string
- `endDate` - ISO date string
- `tags` - comma-separated tags
- `goalId` - filter by goal
- `dailyPlanId` - filter by daily plan

**Response:**
```json
{
  "success": true,
  "count": 12,
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Morning workout",
      "description": "30 min cardio and stretching",
      "status": "TODO",
      "priority": "HIGH",
      "dueDate": "2026-01-19T08:00:00Z",
      "estimatedMinutes": 30,
      "category": "FITNESS",
      "aiGenerated": true,
      "source": "AI_GENERATED",
      "aiRecommendation": "Morning exercise boosts energy for the day",
      "tags": ["exercise", "morning"],
      "subtasks": []
    }
  ]
}
```

#### 2. Get Task by ID
```http
GET /api/v1/tasks/:id
```

#### 3. Create Task
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "title": "Complete project proposal",
  "description": "Write and submit Q1 project proposal",
  "priority": "HIGH",
  "category": "CAREER",
  "dueDate": "2026-01-25",
  "estimatedMinutes": 120,
  "tags": ["work", "deadline"]
}
```

#### 4. Update Task
```http
PATCH /api/v1/tasks/:id
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "actualMinutes": 45,
  "notes": "Making good progress"
}
```

#### 5. Delete Task
```http
DELETE /api/v1/tasks/:id
```

---

### Bulk Operations

#### 6. Bulk Create Tasks
```http
POST /api/v1/tasks/bulk/create
Content-Type: application/json

{
  "tasks": [
    {
      "title": "Task 1",
      "priority": "HIGH",
      "dueDate": "2026-01-20"
    },
    {
      "title": "Task 2",
      "priority": "MEDIUM",
      "dueDate": "2026-01-21"
    }
  ]
}
```

#### 7. Bulk Update Tasks
```http
PATCH /api/v1/tasks/bulk/update
Content-Type: application/json

{
  "taskIds": ["task-id-1", "task-id-2"],
  "updates": {
    "status": "COMPLETED"
  }
}
```

#### 8. Bulk Delete Tasks
```http
DELETE /api/v1/tasks/bulk/delete
Content-Type: application/json

{
  "taskIds": ["task-id-1", "task-id-2", "task-id-3"]
}
```

---

### Task Status Operations

#### 9. Complete Task
```http
POST /api/v1/tasks/:id/complete
Content-Type: application/json

{
  "actualMinutes": 45
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task marked as complete",
  "task": {
    "id": "task-uuid",
    "status": "COMPLETED",
    "completedAt": "2026-01-19T10:30:00Z",
    "actualMinutes": 45
  }
}
```

#### 10. Skip Task with Reason
```http
POST /api/v1/tasks/:id/skip
Content-Type: application/json

{
  "reason": "Not enough time today"
}
```

---

### AI-Powered Features

#### 11. Generate Tasks from Goals
```http
POST /api/v1/tasks/ai/generate-from-goals
```

Automatically generates actionable tasks based on user's active goals.

**Response:**
```json
{
  "success": true,
  "message": "Generated 8 tasks from your goals",
  "tasks": [
    {
      "title": "Morning 30-min jog",
      "description": "Build cardiovascular endurance",
      "priority": "HIGH",
      "category": "FITNESS",
      "estimatedMinutes": 30,
      "aiRecommendation": "Supports your fitness goal",
      "difficultyLevel": 6
    }
  ],
  "tokensUsed": 1234
}
```

#### 12. Generate Daily Tasks
```http
POST /api/v1/tasks/ai/generate-daily
```

Generates optimized task list for today based on goals, habits, and schedule.

#### 13. Breakdown Complex Task
```http
POST /api/v1/tasks/:id/breakdown
```

AI breaks down a complex task into manageable subtasks.

**Response:**
```json
{
  "success": true,
  "message": "Created 5 subtasks",
  "subtasks": [
    {
      "title": "Research competitors",
      "estimatedMinutes": 20,
      "order": 1
    },
    {
      "title": "Create outline",
      "estimatedMinutes": 15,
      "order": 2
    }
  ]
}
```

#### 14. Magic Sync 🪄
```http
POST /api/v1/tasks/ai/magic-sync
Content-Type: application/json

{
  "userInput": "I'm feeling low energy today"
}
```

**What it does:**
- Reorganizes all pending tasks
- Reschedules based on priority and urgency
- Adjusts for user's current energy level
- Rebalances workload

**Response:**
```json
{
  "success": true,
  "message": "Tasks successfully synced and rebalanced",
  "tasksUpdated": 15,
  "prioritization": {
    "urgent": 2,
    "high": 5,
    "medium": 6,
    "low": 2
  }
}
```

---

### Analytics & Insights

#### 15. Get Task Statistics
```http
GET /api/v1/tasks/analytics/stats?startDate=2026-01-01&endDate=2026-01-19
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "completed": 120,
    "pending": 25,
    "overdue": 3,
    "inProgress": 2,
    "completionRate": 80.0,
    "aiGenerated": 90,
    "manual": 60
  }
}
```

#### 16. Get Productivity Analytics
```http
GET /api/v1/tasks/analytics/productivity?days=30
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalCompleted": 85,
    "dailyCompletion": {
      "2026-01-01": 3,
      "2026-01-02": 5,
      "2026-01-03": 4
    },
    "avgCompletionTime": 42,
    "mostProductiveHour": "10:00",
    "currentStreak": 12
  }
}
```

#### 17. Detect Patterns
```http
GET /api/v1/tasks/analytics/patterns
```

**Response:**
```json
{
  "success": true,
  "patterns": [
    {
      "type": "SKIP_PATTERN",
      "description": "You frequently skip FITNESS tasks",
      "suggestion": "Consider breaking down FITNESS tasks into smaller steps"
    },
    {
      "type": "PRODUCTIVITY_PEAK",
      "description": "Your peak productivity is around 10:00",
      "suggestion": "Schedule high-priority tasks during this time"
    },
    {
      "type": "ESTIMATION_ERROR",
      "description": "You tend to underestimate task duration by 25%",
      "suggestion": "Add buffer time to your estimates"
    }
  ]
}
```

#### 18. Get Overdue Tasks
```http
GET /api/v1/tasks/special/overdue
```

#### 19. Get Today's Tasks
```http
GET /api/v1/tasks/special/today
```

---

## AI Features

### 1. Task Generation from Goals

The AI analyzes user's goals and generates specific, actionable tasks.

**Input:**
- User's active goals
- User preferences (wake time, work hours, timezone)

**Output:**
- 5-15 actionable tasks
- Categorized by goal type
- Prioritized based on goal importance
- Time estimates included
- AI recommendations for each task

**Example:**
```
Goal: "Lose 10 pounds in 3 months"
↓
Generated Tasks:
1. "30-min morning jog" (HIGH priority, 30 min)
2. "Meal prep for the week" (MEDIUM priority, 90 min)
3. "Track daily calorie intake" (HIGH priority, 5 min)
4. "Evening yoga session" (MEDIUM priority, 20 min)
```

### 2. Daily Task Generation

Creates an optimized daily task list based on:
- Active goals
- Active habits to maintain
- User's schedule and preferences
- Past productivity patterns

### 3. Complex Task Breakdown

Breaks down large, overwhelming tasks into smaller steps.

**Example:**
```
Task: "Launch new marketing campaign"
↓
Subtasks:
1. Research target audience (20 min)
2. Create content calendar (30 min)
3. Design ad creatives (60 min)
4. Set up tracking pixels (15 min)
5. Launch campaign (10 min)
```

### 4. Pattern Detection & Adaptation

The AI learns from user behavior:
- **Skip patterns** - Identifies frequently skipped task types
- **Productivity peaks** - Finds best working hours
- **Estimation accuracy** - Adjusts time estimates
- **Energy patterns** - Detects high/low energy periods

### 5. Magic Sync Algorithm

Intelligently rebalances tasks based on:
```
1. Current time and available hours
2. Task urgency (overdue, due today, future)
3. Task priority (URGENT > HIGH > MEDIUM > LOW)
4. User's energy level (from input)
5. Task duration estimates
6. Dependencies between tasks
```

---

## Analytics & Insights

### Available Analytics

#### 1. **Completion Rate Analytics**
- Overall completion rate
- By time period (day, week, month, year)
- By category
- By priority
- AI vs manual tasks

#### 2. **Time Analytics**
- Average completion time
- Time estimation accuracy
- Most/least productive hours
- Daily completion trends

#### 3. **Category Breakdown**
- Tasks by category
- Completion rate per category
- Most productive categories

#### 4. **Priority Analysis**
- Tasks by priority
- Completion rate by priority
- Priority distribution

#### 5. **Streak Analytics**
- Current streak
- Longest streak
- Streak milestones
- Last completion date

#### 6. **Pattern Detection**
- Skip patterns
- Productivity peaks
- Estimation errors
- Category preferences

---

## Notification System

### Types of Notifications

#### 1. **Task Reminders**
- Sent at scheduled times
- Email + in-app notification
- Includes task details and priority

#### 2. **Daily Task Summary**
- Morning reminder of today's tasks
- Consolidated email with all tasks
- Prioritized list

#### 3. **Deadline Alerts**
- **Upcoming:** 1 hour before due time
- **Overdue:** Daily summary of overdue tasks
- Priority-based urgency

#### 4. **Completion Notifications**
- Congratulations on task completion
- Encouragement messages
- Progress updates

#### 5. **Streak Milestones**
- Celebrations at 7, 14, 30, 60, 90, 180, 365 days
- Achievement badges
- Motivational messages

### Notification Delivery

**Channels:**
- **In-app:** Immediate, stored in database
- **Email:** HTML templates, user preferences respected
- **Push:** (Future implementation)

**User Control:**
- Enable/disable email reminders
- Set reminder times
- Choose notification types

---

## Usage Examples

### Scenario 1: New User Onboarding

```javascript
// 1. User creates goals
POST /api/v1/goals
{
  "title": "Get fit",
  "category": "FITNESS",
  "targetDate": "2026-04-19"
}

// 2. Generate tasks from goals
POST /api/v1/tasks/ai/generate-from-goals
// Returns 8 actionable fitness tasks

// 3. Get today's tasks
GET /api/v1/tasks/special/today
// Shows tasks scheduled for today

// 4. Complete a task
POST /api/v1/tasks/{taskId}/complete
{
  "actualMinutes": 30
}
```

### Scenario 2: Daily Task Management

```javascript
// Morning: Check today's tasks
GET /api/v1/tasks/special/today

// During day: Update task status
PATCH /api/v1/tasks/{taskId}
{
  "status": "IN_PROGRESS"
}

// If overwhelmed: Use Magic Sync
POST /api/v1/tasks/ai/magic-sync
{
  "userInput": "I have an unexpected meeting, need to reschedule"
}

// Evening: Complete tasks
POST /api/v1/tasks/{taskId}/complete
{
  "actualMinutes": 45
}
```

### Scenario 3: Analytics Review

```javascript
// Weekly review: Check stats
GET /api/v1/tasks/analytics/stats

// Check productivity patterns
GET /api/v1/tasks/analytics/productivity?days=7

// Identify improvement areas
GET /api/v1/tasks/analytics/patterns

// Compare AI vs manual tasks
// (Included in stats response)
```

---

## Workflow Diagrams

### Task Creation Flow

```
User Creates Goal
       ↓
AI Analyzes Goal
       ↓
AI Generates Tasks
       ↓
Tasks Stored in Database
       ↓
Tasks Appear in User Dashboard
       ↓
Notifications Scheduled
```

### Task Completion Flow

```
User Marks Task as Complete
       ↓
Update Task Status & Timestamps
       ↓
Update Related Plan Completion Rate
       ↓
Calculate & Update Streak
       ↓
Send Completion Notification
       ↓
Check for Milestone Achievement
       ↓
Log Activity
```

### Magic Sync Flow

```
User Clicks Magic Sync
       ↓
Fetch All Pending Tasks
       ↓
Categorize by Priority & Urgency
       ↓
Consider User's Current Context
       ↓
AI Rebalances & Reschedules
       ↓
Update All Task Schedules
       ↓
Return Prioritization Summary
```

---

## Best Practices

### For Frontend Integration

1. **Poll for notifications** every 30-60 seconds
2. **Cache task list** and update on changes
3. **Show loading states** for AI operations (can take 3-5 seconds)
4. **Display AI recommendations** to increase user trust
5. **Highlight overdue tasks** prominently
6. **Show streak counter** for gamification

### For Backend

1. **Set up cron jobs** for:
   - Daily task reminders (8:00 AM)
   - Overdue checks (9:00 AM, 5:00 PM)
   - Weekly analytics (Sunday evening)

2. **Rate limit AI endpoints** to prevent token abuse

3. **Cache AI responses** when appropriate

4. **Log all AI operations** for debugging

### For Users

1. **Be specific in task titles** - Helps AI understand context
2. **Track actual time** - Improves AI time estimates
3. **Add skip reasons** - Helps AI adapt to your patterns
4. **Use Magic Sync** when overwhelmed
5. **Review analytics weekly** - Identify improvement areas

---

## Future Enhancements

### Planned Features

- [ ] Task templates
- [ ] Shared tasks (collaboration)
- [ ] Voice input for tasks
- [ ] Calendar integration
- [ ] Task dependencies visualization
- [ ] Pomodoro timer integration
- [ ] Task automation triggers
- [ ] Smart task delegation
- [ ] AI-powered time blocking
- [ ] Task import/export

---

## Technical Notes

### Performance Considerations

- Tasks are indexed by: `userId`, `status`, `dueDate`, `priority`, `category`
- Use pagination for large task lists
- AI operations are async and may take 3-10 seconds
- Bulk operations are optimized with `createMany` and `updateMany`

### Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Token Usage

OpenAI API calls consume tokens:
- Task generation: ~500-1000 tokens
- Task breakdown: ~300-500 tokens
- Pattern analysis: ~800-1200 tokens

Monitor and set monthly limits per user.

---

## Support & Troubleshooting

### Common Issues

**Issue:** AI not generating tasks
- **Solution:** Check OpenAI API key, verify goals exist

**Issue:** Tasks not appearing
- **Solution:** Check filters, verify user authentication

**Issue:** Magic Sync not working
- **Solution:** Ensure pending tasks exist, check API response

**Issue:** Notifications not sending
- **Solution:** Verify email service configuration, check user settings

---

## Conclusion

The Task System is a comprehensive, AI-powered solution that combines:
- ✅ Flexible manual task management
- ✅ Intelligent AI-powered task generation
- ✅ Advanced analytics and insights
- ✅ Adaptive learning from user behavior
- ✅ Comprehensive notification system

This creates a **powerful productivity tool** that helps users:
- Stay organized
- Complete more tasks
- Build better habits
- Understand their productivity patterns
- Achieve their goals

---

**Version:** 1.0  
**Last Updated:** January 18, 2026  
**Author:** Fellini Backend Team
