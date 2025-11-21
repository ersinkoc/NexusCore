# Migration Plan: localStorage to httpOnly Cookies

**Priority**: HIGH
**Complexity**: High (Full-stack architectural change)
**Estimated Effort**: 8-12 hours
**Risk Level**: Medium (Breaking change for existing clients)

---

## Executive Summary

Currently, the NexusCore application stores JWT access tokens in browser localStorage, which exposes them to XSS attacks. This migration plan outlines the steps required to migrate to secure httpOnly cookies, which cannot be accessed by JavaScript and provide better security against XSS vulnerabilities.

---

## Current Architecture

### Access Token Flow (Current - INSECURE)
1. User logs in → Backend returns `accessToken` in response body
2. Frontend stores `accessToken` in `localStorage`
3. Frontend manually adds `Authorization: Bearer <token>` to each request
4. Any XSS vulnerability can steal the token via `localStorage.getItem('accessToken')`

### Refresh Token Flow (Current - SECURE)
1. Refresh token stored in database
2. Sent via `withCredentials: true` (cookie)
3. httpOnly cookie (cannot be accessed by JavaScript)

---

## Target Architecture

### Access Token Flow (Target - SECURE)
1. User logs in → Backend sets httpOnly cookie with access token
2. Browser automatically sends cookie with each request
3. Backend reads token from cookie instead of Authorization header
4. XSS attacks cannot access httpOnly cookies

### Key Changes
- Access tokens moved from localStorage to httpOnly cookies
- Both access and refresh tokens in secure cookies
- CORS configuration updated to support credentials
- Frontend no longer manages token storage manually

---

## Implementation Plan

### Phase 1: Backend Changes

#### 1.1 Update Authentication Controller
**File**: `apps/api/src/modules/auth/auth.controller.ts`

**Changes**:
- Remove `accessToken` from response body
- Set httpOnly cookie instead:

```typescript
// In login/register/refresh methods
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // CSRF protection
  maxAge: 15 * 60 * 1000, // 15 minutes (matches JWT expiry)
  path: '/',
});

// Return only user data (no token)
res.status(200).json({
  success: true,
  data: { user },
});
```

#### 1.2 Update Authentication Middleware
**File**: `apps/api/src/modules/auth/auth.middleware.ts`

**Changes**:
- Read token from cookie instead of Authorization header
- Fallback to Authorization header for backward compatibility (temporary)

```typescript
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // Try cookie first (new method)
    let token = req.cookies?.accessToken;

    // Fallback to Authorization header (legacy support)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = JWTService.verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;

    next();
  } catch (error) {
    next(error);
  }
}
```

#### 1.3 Update Logout Handler
**File**: `apps/api/src/modules/auth/auth.controller.ts`

**Changes**:
- Clear httpOnly cookie on logout

```typescript
logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await this.authService.logout(refreshToken);
  }

  // Clear both cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});
```

#### 1.4 Install cookie-parser Middleware
**File**: `apps/api/package.json` and `apps/api/src/app.ts`

**Install**:
```bash
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

**Configure**:
```typescript
import cookieParser from 'cookie-parser';

// Add before routes
app.use(cookieParser());
```

#### 1.5 Update CORS Configuration
**File**: `apps/api/src/app.ts`

**Changes**:
```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // REQUIRED for cookies
    exposedHeaders: ['set-cookie'],
  })
);
```

---

### Phase 2: Frontend Changes

#### 2.1 Remove localStorage Token Storage
**File**: `apps/web/src/store/auth.store.ts`

**Changes**:
- Remove all `localStorage.setItem('accessToken', ...)` calls
- Remove `localStorage.getItem('accessToken')` calls
- Only store user data in Zustand store

```typescript
setAuth: (user, accessToken) => {
  // Remove: localStorage.setItem('accessToken', accessToken);
  set({
    user,
    isAuthenticated: true,
    // Remove: accessToken field
  });
},

clearAuth: () => {
  // Remove: localStorage.removeItem('accessToken');
  set({
    user: null,
    isAuthenticated: false,
  });
},
```

#### 2.2 Update API Client
**File**: `apps/web/src/lib/api-client.ts`

**Changes**:
- Remove Authorization header injection
- Ensure `withCredentials: true` is set
- Remove token refresh interceptor (backend handles it)

```typescript
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Send cookies automatically
});

// REMOVE request interceptor that adds Authorization header
// (No longer needed - cookies sent automatically)

// SIMPLIFY response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If 401, redirect to login (token refresh handled by backend)
    if (error.response?.status === 401) {
      const basePath = import.meta.env.BASE_URL || '/';
      window.location.href = `${basePath}login`.replace('//', '/');
    }
    return Promise.reject(error);
  }
);
```

#### 2.3 Update Login/Register Handlers
**File**: `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`

**Changes**:
- Don't expect `accessToken` in response
- Only store user data

```typescript
onSuccess: (data) => {
  const { user } = data.data;
  setAuth(user); // No longer pass accessToken
  navigate('/dashboard');
},
```

---

### Phase 3: Environment Configuration

#### 3.1 Backend Environment Variables
**File**: `apps/api/.env`

**Add**:
```env
# Cookie configuration
COOKIE_DOMAIN=localhost  # Change to .yourdomain.com in production
FRONTEND_URL=http://localhost:5173  # For CORS
```

#### 3.2 Frontend Environment Variables
**File**: `apps/web/.env`

**Verify**:
```env
VITE_API_URL=http://localhost:4000/api
```

---

### Phase 4: Testing & Validation

#### 4.1 Manual Testing Checklist
- [ ] Login flow works and sets cookies
- [ ] Authenticated requests include cookies
- [ ] Logout clears cookies
- [ ] Token refresh works automatically
- [ ] 401 errors redirect to login
- [ ] Cookies have correct flags (httpOnly, secure, sameSite)
- [ ] Cross-origin requests work with CORS

#### 4.2 Automated Tests

**Add Cookie Tests**:
```typescript
describe('Authentication with httpOnly cookies', () => {
  it('should set httpOnly cookie on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toMatch(/accessToken=/);
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });

  it('should clear cookies on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ['accessToken=token', 'refreshToken=token']);

    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toMatch(/accessToken=;/);
  });
});
```

#### 4.3 Security Validation
- [ ] Verify cookies have `HttpOnly` flag
- [ ] Verify cookies have `Secure` flag in production
- [ ] Verify `SameSite=Strict` is set
- [ ] Test XSS attack cannot access cookies
- [ ] Verify CORS only allows configured origins

---

### Phase 5: Deployment Strategy

#### 5.1 Pre-Deployment
1. **Backup Database**: Ensure refresh tokens are backed up
2. **Feature Flag**: Consider implementing feature flag for gradual rollout
3. **Documentation**: Update API documentation (Swagger) to reflect cookie-based auth
4. **Team Notification**: Inform team of breaking change

#### 5.2 Deployment Sequence
1. Deploy backend with dual support (cookies + Authorization header)
2. Test backend in staging
3. Deploy frontend with cookie-only implementation
4. Test end-to-end in staging
5. Deploy to production
6. Monitor error rates and login success rates
7. After 1 week: Remove Authorization header fallback from backend

#### 5.3 Rollback Plan
If issues occur:
1. Revert frontend to previous version (uses localStorage)
2. Backend maintains backward compatibility (Authorization header)
3. Investigate and fix issues
4. Re-deploy following sequence

---

### Phase 6: Production Configuration

#### 6.1 HTTPS Requirement
**Critical**: httpOnly cookies with `secure: true` require HTTPS.

**Production Environment**:
```env
NODE_ENV=production
COOKIE_DOMAIN=.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Cookie Configuration**:
```typescript
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'lax', // 'strict' may break some OAuth flows
  domain: process.env.COOKIE_DOMAIN,
  maxAge: 15 * 60 * 1000,
});
```

#### 6.2 Subdomain Considerations
If API and frontend are on different subdomains:
- API: `api.yourdomain.com`
- Frontend: `app.yourdomain.com`

Set cookie domain to `.yourdomain.com` (note the leading dot).

---

### Phase 7: Mobile/Native App Considerations

#### 7.1 Mobile Apps
If you have mobile apps, they may need special handling:

**Option 1**: Continue using Authorization header for mobile
```typescript
// In middleware, support both methods
if (req.headers['user-agent']?.includes('Mobile')) {
  // Use Authorization header
} else {
  // Use cookies
}
```

**Option 2**: Use secure storage in mobile apps
- iOS: Keychain
- Android: Encrypted SharedPreferences
- React Native: react-native-keychain

---

## Risk Mitigation

### Security Risks
| Risk | Mitigation |
|------|------------|
| CSRF attacks | Use `SameSite=Strict` or `SameSite=Lax` |
| Cookie theft (man-in-the-middle) | Require HTTPS in production (`secure: true`) |
| Cross-subdomain issues | Set appropriate cookie domain |
| Mobile app compatibility | Maintain Authorization header for mobile |

### Operational Risks
| Risk | Mitigation |
|------|------------|
| Existing users logged out | Acceptable (security improvement) |
| Browser compatibility | httpOnly cookies supported by all modern browsers |
| Testing complexity | Automated integration tests |
| Deployment coordination | Feature flag for gradual rollout |

---

## Success Criteria

✅ **Security**:
- Tokens inaccessible to JavaScript
- All cookies have httpOnly flag
- HTTPS enforced in production

✅ **Functionality**:
- Login/logout works correctly
- Authenticated requests succeed
- Token refresh is automatic
- Error handling redirects to login

✅ **Performance**:
- No increase in request latency
- No memory leaks
- Proper cookie cleanup

✅ **Monitoring**:
- Login success rate >99%
- Error rate <0.1%
- No increase in 401 errors

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Backend Changes | 2-3 hours | None |
| Phase 2: Frontend Changes | 2-3 hours | Phase 1 complete |
| Phase 3: Environment Config | 30 min | Phase 1-2 complete |
| Phase 4: Testing | 2-3 hours | Phase 1-3 complete |
| Phase 5: Deployment | 1-2 hours | Phase 4 complete |
| Phase 6: Production Config | 1 hour | Phase 5 complete |
| Phase 7: Mobile Support (if needed) | 2-4 hours | Optional |

**Total Estimated Time**: 8-12 hours (1-2 days)

---

## Rollout Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Team trained on new flow
- [ ] Staging environment tested
- [ ] Rollback plan documented

### Deployment
- [ ] Database backup complete
- [ ] Backend deployed with dual support
- [ ] Backend smoke tests passing
- [ ] Frontend deployed
- [ ] End-to-end tests passing
- [ ] Production monitoring active

### Post-Deployment
- [ ] Monitor login success rates (first 24h)
- [ ] Monitor error rates (first week)
- [ ] Collect user feedback
- [ ] Remove Authorization header fallback (after 1 week)
- [ ] Update documentation
- [ ] Close migration ticket

---

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Auth0: Cookies vs Tokens](https://auth0.com/blog/cookies-vs-tokens-definitive-guide/)
- [Express cookie-parser](https://expressjs.com/en/resources/middleware/cookie-parser.html)

---

**Last Updated**: 2025-11-20
**Status**: Planning Phase
**Owner**: Development Team
**Reviewer**: Security Team
