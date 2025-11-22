# Audit Log & Session Management API Documentation

## Overview

This document describes the audit logging and session management endpoints added to NexusCore as part of the comprehensive security improvements initiative.

## Table of Contents

- [Audit Log API](#audit-log-api)
- [Session Management API](#session-management-api)
- [Security Considerations](#security-considerations)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)

---

## Audit Log API

The Audit Log API provides endpoints to view security-sensitive operations and user activities across the system.

### Base URL

```
/api/audit
```

### Endpoints

#### 1. Get Current User's Audit Trail

Retrieve the audit log entries for the authenticated user.

**Endpoint:** `GET /api/audit/me`

**Authentication:** Required (JWT)

**Query Parameters:**

- `limit` (optional): Maximum number of records to return (default: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "action": "AUTH_LOGIN",
        "entity": "user",
        "entityId": "user-uuid",
        "details": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        },
        "createdAt": "2025-11-21T10:30:00.000Z"
      }
    ],
    "count": 45
  }
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:4000/api/audit/me?limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 2. Get User's Audit Trail (Admin/Self Only)

Retrieve audit log entries for a specific user.

**Endpoint:** `GET /api/audit/user/:userId`

**Authentication:** Required (JWT)

**Authorization:**

- Admins can view any user's logs
- Regular users can only view their own logs

**Path Parameters:**

- `userId`: UUID of the target user

**Query Parameters:**

- `limit` (optional): Maximum number of records to return (default: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "action": "POST_CREATE",
        "entity": "post",
        "entityId": "post-uuid",
        "details": {
          "title": "My First Post"
        },
        "createdAt": "2025-11-21T10:30:00.000Z"
      }
    ],
    "count": 23
  }
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:4000/api/audit/user/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "message": "You do not have permission to view these audit logs",
    "statusCode": 403
  }
}
```

---

#### 3. Get Entity Audit Trail

Retrieve audit log entries for a specific entity (e.g., a post, user, etc.).

**Endpoint:** `GET /api/audit/entity/:entity/:entityId`

**Authentication:** Required (JWT)

**Authorization:**

- Admins can view all entity logs
- Regular users can only view logs for their own actions or public data

**Path Parameters:**

- `entity`: Entity type (e.g., "post", "user", "comment")
- `entityId`: UUID of the entity

**Query Parameters:**

- `limit` (optional): Maximum number of records to return (default: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "action": "POST_UPDATE",
        "entity": "post",
        "entityId": "post-uuid",
        "details": {
          "changes": {
            "title": {
              "old": "Original Title",
              "new": "Updated Title"
            }
          }
        },
        "createdAt": "2025-11-21T10:30:00.000Z"
      }
    ],
    "count": 12
  }
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:4000/api/audit/entity/post/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 4. Get Security Events (Admin Only)

Retrieve security-sensitive audit log entries across the entire system.

**Endpoint:** `GET /api/audit/security`

**Authentication:** Required (JWT)

**Authorization:** Admin role only

**Query Parameters:**

- `limit` (optional): Maximum number of records to return (default: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "action": "ACCOUNT_LOCKED",
        "entity": "user",
        "entityId": "user-uuid",
        "details": {
          "reason": "Too many failed login attempts",
          "attempts": 5,
          "lockDuration": "15 minutes"
        },
        "createdAt": "2025-11-21T10:30:00.000Z"
      },
      {
        "id": "uuid",
        "userId": null,
        "action": "AUTH_FAILED",
        "entity": "auth",
        "entityId": null,
        "details": {
          "email": "attacker@example.com",
          "ip": "192.168.1.100",
          "reason": "Invalid credentials"
        },
        "createdAt": "2025-11-21T10:25:00.000Z"
      }
    ],
    "count": 8
  }
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:4000/api/audit/security?limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "message": "You do not have permission to view security events",
    "statusCode": 403
  }
}
```

---

## Session Management API

The Session Management API allows users to view and manage their active sessions across different devices.

### Base URL

```
/api/auth
```

### Endpoints

#### 1. Get Active Sessions

Retrieve all active sessions for the authenticated user.

**Endpoint:** `GET /api/auth/sessions`

**Authentication:** Required (JWT)

**Response:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "userId": "user-uuid",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "lastActivity": "2025-11-21T10:30:00.000Z",
        "createdAt": "2025-11-21T08:00:00.000Z",
        "expiresAt": "2025-11-28T08:00:00.000Z"
      },
      {
        "id": "session-uuid-2",
        "userId": "user-uuid",
        "ipAddress": "192.168.1.2",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        "lastActivity": "2025-11-21T09:15:00.000Z",
        "createdAt": "2025-11-20T14:30:00.000Z",
        "expiresAt": "2025-11-27T14:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

**Example Request:**

```bash
curl -X GET "http://localhost:4000/api/auth/sessions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### 2. Revoke Session

Revoke (delete) a specific session. Users can only revoke their own sessions.

**Endpoint:** `DELETE /api/auth/sessions/:sessionId`

**Authentication:** Required (JWT)

**Authorization:** Users can only revoke their own sessions (ownership verification performed)

**Path Parameters:**

- `sessionId`: UUID of the session to revoke

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Session revoked successfully"
  }
}
```

**Example Request:**

```bash
curl -X DELETE "http://localhost:4000/api/auth/sessions/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Special Behavior:**

- If you revoke your **current session** (the one you're using), all authentication cookies (`refreshToken`, `csrfToken`, `sessionId`) will be automatically cleared
- You'll need to log in again to continue using the API

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "message": "Session not found or does not belong to you",
    "statusCode": 404
  }
}
```

---

## Security Considerations

### Access Control

1. **Audit Logs:**
   - All audit endpoints require authentication
   - Non-admin users can only view their own audit trail
   - Admin-only endpoints (`/security`) explicitly check for `UserRole.ADMIN`
   - Entity logs are filtered for non-admins to show only their own actions

2. **Session Management:**
   - Users can only view and revoke their own sessions
   - Session ownership is verified before allowing deletion
   - Attempting to revoke another user's session returns 404 (not 403 to prevent session ID enumeration)

### Audit Event Types

The system logs the following security-sensitive events:

**Authentication Events:**

- `AUTH_LOGIN` - Successful login
- `AUTH_LOGOUT` - User logout
- `AUTH_FAILED` - Failed login attempt
- `AUTH_TOKEN_REFRESH` - Access token refreshed
- `AUTH_PASSWORD_RESET_REQUEST` - Password reset requested
- `AUTH_PASSWORD_RESET_COMPLETE` - Password successfully reset

**Account Security Events:**

- `ACCOUNT_LOCKED` - Account locked due to too many failed attempts
- `ACCOUNT_UNLOCKED` - Account unlocked (manual or automatic)
- `SESSION_CREATED` - New session created
- `SESSION_REVOKED` - Session manually revoked
- `SESSION_EXPIRED` - Session expired

**User Activity Events:**

- `USER_CREATED` - New user registered
- `USER_UPDATED` - User profile updated
- `USER_DELETED` - User account deleted
- `POST_CREATE` - Post created
- `POST_UPDATE` - Post updated
- `POST_DELETE` - Post deleted

### Rate Limiting

All audit and session management endpoints are subject to the application's global rate limiting:

- **Standard limit:** 100 requests per 15 minutes per IP
- **Strict limit (auth):** 5 requests per 15 minutes for login attempts

### Data Retention

- **Active Sessions:** Automatically cleaned up after 30 days of inactivity
- **Audit Logs:** Retained indefinitely (implement your own retention policy as needed)

---

## Integration Examples

### React/TypeScript Frontend Example

#### Fetching User's Audit Trail

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, any>;
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    count: number;
  };
}

export const useUserAuditLogs = (limit = 50) => {
  return useQuery<AuditResponse>({
    queryKey: ['audit', 'me', limit],
    queryFn: async () => {
      const { data } = await axios.get(
        `http://localhost:4000/api/audit/me?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return data;
    },
  });
};

// Usage in component
function AuditLogViewer() {
  const { data, isLoading, error } = useUserAuditLogs(100);

  if (isLoading) return <div>Loading audit logs...</div>;
  if (error) return <div>Error loading audit logs</div>;

  return (
    <div>
      <h2>Your Activity History</h2>
      <p>Total events: {data?.data.count}</p>
      <ul>
        {data?.data.logs.map((log) => (
          <li key={log.id}>
            <strong>{log.action}</strong> - {log.entity} -
            {new Date(log.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### Managing Active Sessions

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

interface SessionsResponse {
  success: boolean;
  data: {
    sessions: Session[];
    count: number;
  };
}

// Fetch sessions
export const useActiveSessions = () => {
  return useQuery<SessionsResponse>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await axios.get(
        'http://localhost:4000/api/auth/sessions',
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return data;
    },
  });
};

// Revoke session
export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await axios.delete(
        `http://localhost:4000/api/auth/sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      // Refresh the sessions list
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
};

// Usage in component
function SessionManager() {
  const { data, isLoading } = useActiveSessions();
  const revokeSession = useRevokeSession();

  const handleRevokeSession = (sessionId: string) => {
    if (confirm('Are you sure you want to revoke this session?')) {
      revokeSession.mutate(sessionId);
    }
  };

  if (isLoading) return <div>Loading sessions...</div>;

  return (
    <div>
      <h2>Active Sessions</h2>
      <p>You have {data?.data.count} active session(s)</p>
      <ul>
        {data?.data.sessions.map((session) => (
          <li key={session.id}>
            <div>
              <strong>IP:</strong> {session.ipAddress}
            </div>
            <div>
              <strong>Device:</strong> {parseUserAgent(session.userAgent)}
            </div>
            <div>
              <strong>Last active:</strong>{' '}
              {new Date(session.lastActivity).toLocaleString()}
            </div>
            <button onClick={() => handleRevokeSession(session.id)}>
              Revoke Session
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Mobile')) return 'Mobile Device';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}
```

---

## Error Handling

All endpoints follow the standard NexusCore error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

### Common Error Codes

| Status Code | Error                 | Description                                  |
| ----------- | --------------------- | -------------------------------------------- |
| 401         | Unauthorized          | Missing or invalid authentication token      |
| 403         | Forbidden             | User lacks permission for this operation     |
| 404         | Not Found             | Resource not found or doesn't belong to user |
| 429         | Too Many Requests     | Rate limit exceeded                          |
| 500         | Internal Server Error | Server-side error occurred                   |

### Example Error Handling

```typescript
try {
  const response = await axios.get('http://localhost:4000/api/audit/security', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // Handle success
} catch (error) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const message = error.response?.data?.error?.message;

    switch (statusCode) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        // Show permission denied message
        alert('You do not have permission to view this data');
        break;
      case 404:
        // Resource not found
        alert('The requested resource was not found');
        break;
      case 429:
        // Rate limit exceeded
        alert('Too many requests. Please try again later.');
        break;
      default:
        // Generic error
        alert(message || 'An error occurred');
    }
  }
}
```

---

## Related Documentation

- [Authentication & Authorization Guide](./AUTH.md)
- [Security Best Practices](./SECURITY.md)
- [API Reference](./API-REFERENCE.md)
- [Security Improvements Summary](../SECURITY-IMPROVEMENTS-PART2.md)

---

## Support

For issues or questions:

- GitHub Issues: https://github.com/ersinkoc/NexusCore/issues
- Documentation: `/docs` endpoint (Swagger UI)
