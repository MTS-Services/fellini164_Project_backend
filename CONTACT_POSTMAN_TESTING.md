# Contact Form API - Postman Testing Guide

Complete testing guide for all contact form endpoints (public submit + admin management).

---

## Prerequisites

1. **Server running**
   ```bash
   npm run dev
   ```

2. **Base URL**
   ```
   http://localhost:5000/api/v1/contact
   ```
   > Default port is `5000` (see `.env`). If your `PORT` differs, update the base URL accordingly.

3. **Admin access** (for admin routes only)
   - User must have role `ADMIN` or `SUPER_ADMIN`
   - Login via `POST /api/v1/auth/login` to get a JWT token
   - Use header: `Authorization: Bearer YOUR_ADMIN_JWT_TOKEN`

---

## Postman Environment Variables

Create a Postman environment with these variables:

| Variable | Example Value |
|----------|---------------|
| `baseUrl` | `http://localhost:5000/api/v1` |
| `contactId` | *(set after submit or list — see Step 1)* |
| `adminToken` | *(set after admin login — see Step 2)* |

---

## Testing Flow

Run these steps in order for a full end-to-end test.

---

### STEP 0: Health Check (Optional)

**Request**
```
GET {{baseUrl}}/../health
```
Or directly:
```
GET http://localhost:5000/health
```

**Expected Response (200)**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-28T12:00:00.000Z",
  "environment": "development"
}
```

---

### STEP 1: Submit Contact Form (Public)

**Purpose**: Any public user can submit the contact form. No authentication required.

**Request**
```
POST {{baseUrl}}/contact
```

**Headers**
```
Content-Type: application/json
```

**Body (raw JSON)**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "subject": "Need help with my account",
  "message": "I am having trouble logging in. Can you please help me reset my access?"
}
```

**Validation Rules**

| Field | Rules |
|-------|-------|
| `fullName` | Required, 2–100 characters |
| `email` | Required, valid email |
| `subject` | Required, 1–200 characters |
| `message` | Required, 1–5000 characters |

**Expected Response (201)**
```json
{
  "success": true,
  "message": "Your message has been sent. We'll get back to you shortly.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "email": "john@example.com",
    "subject": "Need help with my account",
    "createdAt": "2026-03-28T12:00:00.000Z"
  }
}
```

**Postman tip**: Copy `data.id` from the response and save it as the `contactId` environment variable for later steps.

**Validation Error (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Full name is required",
      "path": "fullName",
      "location": "body"
    }
  ]
}
```

---

### STEP 2: Admin Login (Get Token)

**Purpose**: Admin routes require a JWT token.

**Request**
```
POST {{baseUrl}}/auth/login
```

**Headers**
```
Content-Type: application/json
```

**Body (raw JSON)**
```json
{
  "email": "admin@example.com",
  "password": "your-admin-password"
}
```

**Expected Response (200)**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "...",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

**Postman tip**: Save `token` as the `adminToken` environment variable.

> If the user role is not `ADMIN` or `SUPER_ADMIN`, admin contact routes will return **403 Forbidden**.

---

### STEP 3: Get All Contact Submissions (Admin)

**Purpose**: Admin can list all contact form submissions with search and pagination.

**Request**
```
GET {{baseUrl}}/contact/admin
```

**Headers**
```
Authorization: Bearer {{adminToken}}
```

**Query Parameters** (all optional)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `search` | Search in name, email, subject, message | — |
| `page` | Page number | `1` |
| `limit` | Items per page (max 100) | `20` |

**Examples**
```
GET {{baseUrl}}/contact/admin
GET {{baseUrl}}/contact/admin?page=1&limit=10
GET {{baseUrl}}/contact/admin?search=john
GET {{baseUrl}}/contact/admin?search=account&page=1&limit=20
```

**Expected Response (200)**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Doe",
      "email": "john@example.com",
      "subject": "Need help with my account",
      "message": "I am having trouble logging in. Can you please help me reset my access?",
      "createdAt": "2026-03-28T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Unauthorized (401)** — missing or invalid token
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**Forbidden (403)** — user is not admin
```json
{
  "success": false,
  "message": "User role 'USER' is not authorized to access this route"
}
```

---

### STEP 4: Get Single Contact by ID (Admin)

**Purpose**: Admin can view one contact submission in full detail.

**Request**
```
GET {{baseUrl}}/contact/admin/{{contactId}}
```

**Headers**
```
Authorization: Bearer {{adminToken}}
```

**Example**
```
GET {{baseUrl}}/contact/admin/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Doe",
    "email": "john@example.com",
    "subject": "Need help with my account",
    "message": "I am having trouble logging in. Can you please help me reset my access?",
    "createdAt": "2026-03-28T12:00:00.000Z",
    "updatedAt": "2026-03-28T12:00:00.000Z"
  }
}
```

**Not Found (404)**
```json
{
  "success": false,
  "message": "Contact submission not found"
}
```

**Invalid ID (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "invalid-id",
      "msg": "Invalid ID format",
      "path": "id",
      "location": "params"
    }
  ]
}
```

---

### STEP 5: Delete Contact Submission (Admin)

**Purpose**: Admin can permanently delete a contact submission.

**Request**
```
DELETE {{baseUrl}}/contact/admin/{{contactId}}
```

**Headers**
```
Authorization: Bearer {{adminToken}}
```

**Example**
```
DELETE {{baseUrl}}/contact/admin/550e8400-e29b-41d4-a716-446655440000
```

**Expected Response (200)**
```json
{
  "success": true,
  "message": "Contact submission deleted successfully"
}
```

**Not Found (404)**
```json
{
  "success": false,
  "message": "Contact submission not found"
}
```

---

## All Routes Summary

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/api/v1/contact` | None | Submit contact form |
| 2 | `GET` | `/api/v1/contact/admin` | Admin | List all submissions |
| 3 | `GET` | `/api/v1/contact/admin/:id` | Admin | Get one submission |
| 4 | `DELETE` | `/api/v1/contact/admin/:id` | Admin | Delete submission |

---

## Quick Postman Collection Setup

### 1. Public Submit
- **Method**: POST
- **URL**: `{{baseUrl}}/contact`
- **Auth**: No Auth
- **Body**: raw → JSON (see Step 1)

### 2. Admin List
- **Method**: GET
- **URL**: `{{baseUrl}}/contact/admin?page=1&limit=20`
- **Auth**: Bearer Token → `{{adminToken}}`

### 3. Admin Get One
- **Method**: GET
- **URL**: `{{baseUrl}}/contact/admin/{{contactId}}`
- **Auth**: Bearer Token → `{{adminToken}}`

### 4. Admin Delete
- **Method**: DELETE
- **URL**: `{{baseUrl}}/contact/admin/{{contactId}}`
- **Auth**: Bearer Token → `{{adminToken}}`

---

## Test Cases Checklist

### Public Submit
- [ ] Submit with valid data → `201`
- [ ] Submit without `fullName` → `400`
- [ ] Submit with invalid email → `400`
- [ ] Submit without `subject` → `400`
- [ ] Submit without `message` → `400`
- [ ] Submit with empty body → `400`

### Admin List
- [ ] List with valid admin token → `200`
- [ ] List without token → `401`
- [ ] List with regular user token → `403`
- [ ] Search by email/name → returns filtered results
- [ ] Pagination `page` and `limit` works

### Admin Get One
- [ ] Get existing contact by ID → `200`
- [ ] Get with invalid UUID → `400`
- [ ] Get non-existent ID → `404`
- [ ] Get without admin token → `401`

### Admin Delete
- [ ] Delete existing contact → `200`
- [ ] Delete same contact again → `404`
- [ ] Delete with invalid UUID → `400`
- [ ] Delete without admin token → `401`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Not authorized` | Login as admin and set `Authorization: Bearer {{adminToken}}` |
| `403 Forbidden` | User role must be `ADMIN` or `SUPER_ADMIN` |
| `404 Contact submission not found` | Check `contactId` is correct and not already deleted |
| `500 Failed to submit contact form` | Restart server after schema changes; run `npx prisma generate` |
| Connection refused | Ensure `npm run dev` is running on the correct port |

---

## Database Table

Submissions are stored in the `contact_submissions` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fullName` | String | Sender name |
| `email` | String | Sender email |
| `subject` | String | Message subject |
| `message` | Text | Message body |
| `createdAt` | DateTime | Submission time |
| `updatedAt` | DateTime | Last updated time |

View data in Prisma Studio:
```bash
npx prisma studio
```
