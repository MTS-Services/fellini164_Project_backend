# Admin Functionality Documentation

## Admin User Credentials

A fixed admin user has been created with the following credentials:

- **Email:** admin@gmail.com
- **Password:** admin12345
- **Role:** ADMIN
- **Status:** Pre-verified (no OTP required)

## Admin Capabilities

The admin user has access to the following features:

### 1. User Management

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```
Returns a list of all users with their details including:
- Email, full name, phone, address
- Role and subscription information
- Email verification status
- Last login and creation date

#### Get User by ID
```http
GET /api/admin/users/:id
Authorization: Bearer <admin_token>
```
Returns detailed information about a specific user.

#### Delete User (soft delete)
```http
DELETE /api/v1/admin/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Requested by support / policy violation"
}
```

Sets `deletedAt` (account stays in the database). The user can no longer log in. Admins cannot delete their own account. Only SUPER_ADMIN can delete another admin.

List users excluding deleted (default): `GET /api/v1/admin/users`  
Include deleted: `GET /api/v1/admin/users?includeDeleted=true`

#### Update User Information
```http
PATCH /api/admin/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phone": "+1234567890",
  "address": "123 Main St",
  "role": "USER",
  "subscriptionPlan": "PRO",
  "subscriptionStatus": "ACTIVE"
}
```
Admin can update any user's information including:
- Personal details (name, phone, address)
- Role (USER, ADMIN, SUPER_ADMIN)
- Subscription plan and status

### 2. Payment History

#### Get All Payments
```http
GET /api/admin/payments
Authorization: Bearer <admin_token>
```
Returns all payment transactions across all users with user details.

#### Get User Payment History
```http
GET /api/admin/users/:id/payments
Authorization: Bearer <admin_token>
```
Returns payment history for a specific user.

### 3. Revenue Analytics

#### Get Revenue Statistics
```http
GET /api/admin/revenue?period=month
Authorization: Bearer <admin_token>
```

Query parameters:
- `period`: day, week, month, year, all (default: all)

Returns:
- Total revenue for the specified period
- Number of completed payments
- Revenue breakdown by subscription plan
- Payment count statistics

### 4. Dashboard Statistics

```http
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

Returns:
- Total users count
- Active subscribers count
- Total revenue (all time)
- New users today

## Authentication Flow

### Admin Login (No OTP Required)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@gmail.com",
  "password": "admin12345"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gmail.com",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "subscriptionPlan": "ULTIMATE",
      "isEmailVerified": true
    },
    "token": "jwt_token_here"
  }
}
```

**Note:** Admin users bypass OTP verification and can log in directly.

## Authorization

All admin routes are protected with:
1. **Authentication:** Must provide a valid JWT token
2. **Authorization:** Must have ADMIN or SUPER_ADMIN role

### Using the Admin Token

Include the JWT token in all admin API requests:

```http
Authorization: Bearer <your_admin_token>
```

## Security Notes

1. The admin password is hashed using bcrypt with 10 salt rounds
2. Admin accounts are pre-verified and don't require OTP
3. Only users with ADMIN or SUPER_ADMIN role can access admin routes
4. Regular users cannot access admin endpoints even with a valid token

## Re-seeding Admin User

If you need to recreate the admin user:

```bash
npm run prisma:seed
```

The seed script will check if the admin already exists and skip creation if found.

## Available Roles

- **USER:** Regular platform user
- **ADMIN:** Full administrative access
- **SUPER_ADMIN:** Reserved for future use (highest level access)

## Schema Updates

The user schema already includes the Role enum with ADMIN support:

```prisma
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

model User {
  // ...
  role Role @default(USER)
  // ...
}
```

## Testing Admin Functionality

1. Login as admin using the credentials above
2. Copy the JWT token from the response
3. Use the token to access admin endpoints
4. Test user management, payment history, and revenue endpoints

## Future Enhancements

Consider implementing:
- Admin activity logs
- User deletion/deactivation
- Bulk user operations
- Advanced revenue analytics with charts
- Export functionality for users and payments
- Email notifications to users from admin
- Custom subscription modifications
