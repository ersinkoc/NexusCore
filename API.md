# NexusCore API Documentation

This document describes all available API endpoints in NexusCore.

**Base URL**: `http://localhost:4000/api`

---

## Table of Contents

- [Authentication](#authentication)
- [Users Management](#users-management)
- [Error Responses](#error-responses)

---

## Authentication

All authentication endpoints are under `/api/auth`.

### Register

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules**:
- `email`: Valid email format, lowercase
- `password`: Min 8 chars, must contain uppercase, lowercase, and number
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGc..."
  }
}
```

**Cookies Set**:
- `refreshToken` (HttpOnly, 7 days)

---

### Login

Authenticate with email and password.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGc..."
  }
}
```

**Cookies Set**:
- `refreshToken` (HttpOnly, 7 days)

**Error Cases**:
- 401: Invalid credentials
- 401: Account is deactivated

---

### Logout

Invalidate refresh token and clear cookies.

**Endpoint**: `POST /api/auth/logout`

**Headers**: None required (uses refreshToken cookie)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Cookies Cleared**:
- `refreshToken`

---

### Refresh Token

Get a new access token using refresh token.

**Endpoint**: `POST /api/auth/refresh`

**Headers**: None required (uses refreshToken cookie)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

**Cookies Updated**:
- `refreshToken` (new token with rotation)

**Error Cases**:
- 401: Refresh token not found
- 401: Invalid refresh token
- 401: Refresh token expired
- 401: Account is deactivated

---

### Get Current User

Get authenticated user's information.

**Endpoint**: `GET /api/auth/me`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

**Authentication**: Required

---

## Users Management

All user management endpoints are under `/api/users`.

### List Users

Get paginated list of users (Admin/Moderator only).

**Endpoint**: `GET /api/users`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Field to sort by (default: createdAt)
- `sortOrder` (optional): asc | desc (default: asc)
- `role` (optional): Filter by role (user, admin, moderator)
- `isActive` (optional): Filter by active status (true, false)
- `search` (optional): Search in email, firstName, lastName

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Authentication**: Required
**Authorization**: Admin or Moderator role

---

### Get User by ID

Get a specific user's details.

**Endpoint**: `GET /api/users/:id`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Authentication**: Required
**Authorization**: Any authenticated user

**Error Cases**:
- 400: Invalid UUID format
- 404: User not found

---

### Update User

Update user details (Admin only).

**Endpoint**: `PATCH /api/users/:id`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Request Body** (all fields optional):
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "newemail@example.com",
  "role": "moderator"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newemail@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "moderator",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Authentication**: Required
**Authorization**: Admin role only

---

### Delete User

Permanently delete a user (Admin only).

**Endpoint**: `DELETE /api/users/:id`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Authentication**: Required
**Authorization**: Admin role only

---

### Deactivate User

Deactivate a user account (Admin/Moderator).

**Endpoint**: `POST /api/users/:id/deactivate`

**Headers**:
- `Authorization: Bearer <accessToken>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Authentication**: Required
**Authorization**: Admin or Moderator role

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []  // Optional, for validation errors
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or token invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Validation Error Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "path": "email",
        "message": "Invalid email address"
      },
      {
        "path": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

## Authentication Flow

### 1. Register/Login
```
Client -> POST /api/auth/register
Server -> Returns accessToken + sets refreshToken cookie
Client -> Stores accessToken in memory
```

### 2. Making Authenticated Requests
```
Client -> GET /api/users
Headers: Authorization: Bearer <accessToken>
Server -> Returns data
```

### 3. Token Expiry & Refresh
```
Client -> GET /api/users
Server -> 401 (access token expired)
Client -> POST /api/auth/refresh (with refreshToken cookie)
Server -> Returns new accessToken + rotates refreshToken
Client -> Retry original request with new accessToken
```

### 4. Logout
```
Client -> POST /api/auth/logout
Server -> Deletes refreshToken from DB + clears cookie
Client -> Clears accessToken from memory
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@nexuscore.local",
    "password": "Admin123!"
  }'
```

### Get Users (with auth)
```bash
curl http://localhost:4000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Header**: `X-RateLimit-Remaining`

When limit is exceeded, you'll receive a 429 error:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

---

## Correlation IDs

Every request receives a unique correlation ID for tracing:
- **Request Header**: `X-Correlation-ID` (optional, auto-generated if not provided)
- **Response Header**: `X-Correlation-ID` (always included)

Use correlation IDs when reporting bugs or investigating issues.

---

For more information, see the [README](./README.md) or visit the [GitHub repository](https://github.com/ersinkoc/NexusCore).
