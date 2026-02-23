# Security & Best Practices Guide

## 🔒 Security Improvements Implemented

This guide documents security enhancements and best practices for the Elegante ERP system.

---

## 1. Input Validation & Sanitization

### New Utilities
- **`lib/security.ts`** - Comprehensive input sanitization
- **`lib/validation.ts`** - Type-safe validation with Zod

### Features
✅ XSS Prevention - HTML/tag sanitization
✅ SQL Injection Prevention - Input escaping and Prisma parameterized queries
✅ Path Traversal Prevention - File upload validation
✅ CSRF Token Support - Ready for implementation
✅ Prototype Pollution Prevention - Object key sanitization
✅ Formula Injection Prevention - CSV cell sanitization

### Usage Examples

```typescript
// Import security utilities
import {
  sanitizeHtml,
  sanitizeEmail,
  sanitizeUrl,
  checkForAttackPatterns,
  validateInputLength,
} from '@/lib/security';

// Sanitize user input
const cleanName = sanitizeHtml(userInput);
const cleanEmail = sanitizeEmail(email);
const cleanUrl = sanitizeUrl(userProvidedUrl);

// Check for attacks
const { safe, threat } = checkForAttackPatterns(input);
if (!safe) {
  console.warn(`Potential ${threat} detected`);
}

// Validate input length
validateInputLength(input, 1, 500, 'User name');
```

---

## 2. Error Handling & Type Safety

### New Error Classes
- **`lib/errors.ts`** - Comprehensive error hierarchy

### Error Types
- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `InternalError` (500)
- `ServiceUnavailableError` (503)
- `DatabaseError` (500)
- `ExternalApiError` (502)
- `BusinessLogicError` (400)

### Usage Examples

```typescript
import { ValidationError, NotFoundError, AppError, ErrorLogger } from '@/lib/errors';

// Throw specific errors
if (!email) {
  throw new ValidationError('Email is required', { field: 'email' });
}

if (!user) {
  throw new NotFoundError('User');
}

// Handle errors
try {
  await someOperation();
} catch (error) {
  ErrorLogger.logWithContext(error, userId, 'OPERATION_NAME');
  throw error;
}
```

---

## 3. Security Headers Middleware

### New Module
- **`lib/headers.ts`** - Security headers configuration

### Headers Applied
- ✅ X-Frame-Options (Clickjacking protection)
- ✅ X-Content-Type-Options (MIME sniffing prevention)
- ✅ Referrer-Policy (Information leakage prevention)
- ✅ Content-Security-Policy (XSS protection)
- ✅ Permissions-Policy (Feature restriction)
- ✅ Strict-Transport-Security (HTTPS enforcement)
- ✅ Cross-Origin policies

### Updated Middleware
- **`middleware.ts`** - Now applies security headers to all responses

---

## 4. API Response Standardization

### New Module
- **`lib/response.ts`** - Standardized response builder

### Success Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "meta": {
    "timestamp": "2024-02-23T10:30:00Z",
    "requestId": "abc123-def456"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "statusCode": 400,
    "details": { "field": "email" }
  },
  "meta": {
    "timestamp": "2024-02-23T10:30:00Z",
    "requestId": "abc123-def456"
  }
}
```

### Usage Examples

```typescript
import { createApiResponse } from '@/lib/response';

export async function GET(request: NextRequest) {
  const api = createApiResponse(request);
  
  try {
    const data = await fetchData();
    return api.success(data, 'Data retrieved');
  } catch (error) {
    return api.error(error);
  }
}
```

---

## 5. Rate Limiting

### Configuration
Environment variables in `.env`:
```
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # per window
RATE_LIMIT_ENABLED=true
```

### Current Implementation
- ✅ In-memory store for development
- ✅ Per-IP rate limiting
- ✅ Response headers with limit info
- ✅ Automatic cleanup of expired entries

### Production Recommendation
Use Redis instead of in-memory:
```typescript
// TODO: Implement Redis-based rate limiting
import redis from 'redis';
```

---

## 6. Validation Best Practices

### Using Custom Schemas

```typescript
import { CustomSchemas } from '@/lib/validation';

// Use pre-defined schemas
const schema = z.object({
  email: CustomSchemas.email,
  password: CustomSchemas.password,
  phone: CustomSchemas.phoneNumber,
  siteUrl: CustomSchemas.url,
  amount: CustomSchemas.amount,
  percentage: CustomSchemas.percentage,
});
```

### Batch Validation

```typescript
import { validateBatch } from '@/lib/validation';

const items = [/* array of items */];
const result = validateBatch(items, userSchema, 100);

if (!result.success) {
  console.log('Validation errors:', result.errors);
  // Use valid items from result.data
}
```

---

## 7. Environment Security

### Best Practices
✅ Never commit `.env` files to git
✅ Use `.env.example` for documentation
✅ Rotate secrets regularly (update `.env.rotation.md`)
✅ Use different secrets per environment
✅ Enable 2FA for production access
✅ Use AWS Secrets Manager for production

### Secrets Rotation Schedule
- `JWT_SECRET` - Every 90 days
- Database credentials - Every 180 days
- API keys - Every 360 days
- OAuth tokens - Every 365 days

---

## 8. Audit Logging

### Comprehensive Audit Trail
Every action is logged with:
- User ID
- Action type
- Resource type and ID
- Timestamp
- IP address
- User agent
- Optional metadata

### Audit Actions Tracked
✅ LOGIN / LOGOUT
✅ Data creation/update/deletion
✅ Permission changes
✅ Sensitive operations
✅ Access attempts
✅ Configuration changes

### Access Logs
```typescript
import { createAuditLog } from '@/lib/audit';

await createAuditLog({
  userId: user.id,
  action: 'CREATE_CUSTOMER',
  entityType: 'Customer',
  entityId: customer.id,
  description: 'Customer created: Acme Corp',
  ipAddress: clientIp,
  userAgent: userAgent,
  metadata: { customerCode: 'CUST-001' },
});
```

---

## 9. Authentication Hardening

### Current Implementation
✅ JWT-based authentication
✅ Bcrypt password hashing (12 rounds)
✅ Token extraction from Authorization header
✅ User active status check
✅ Last login tracking
✅ Audit logging on login

### Recommended Future Improvements

#### 1. Refresh Token Mechanism
```typescript
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN 
  });
}
```

#### 2. Two-Factor Authentication
```typescript
import speakeasy from 'speakeasy';

export function generateTOTP(secret: string) {
  return speakeasy.totp({
    secret,
    encoding: 'base32',
  });
}
```

#### 3. Account Lockout
```typescript
interface FailedLogin {
  userId: string;
  count: number;
  lockUntil: Date;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
```

---

## 10. Data Protection & PII

### Sensitive Data Handling
- ✅ Encryption at rest (recommended: use Prisma field encryption)
- ✅ PII masking in logs
- ✅ Secure data deletion procedures
- ✅ Audit log immutability

### Fields to Encrypt
- Social Security Numbers
- Bank account numbers
- Credit card numbers
- API keys
- Personal addresses

### Implementation Example
```typescript
// TODO: Implement field-level encryption
import { encrypt, decrypt } from '@/lib/encryption';

const encryptedSSN = await encrypt(ssn, encryptionKey);
const decryptedSSN = await decrypt(encryptedSSN, encryptionKey);
```

---

## 11. SQL Injection Prevention

### Safe Practices
✅ Use Prisma ORM with parameterized queries (already implemented)
✅ Never concatenate user input into queries
✅ Validate input types before querying
✅ Use Prisma `where` clauses with proper types

### Example: Safe Query
```typescript
// ✅ SAFE: Prisma parameterized query
const user = await prisma.user.findUnique({
  where: { email: userEmail }, // Parameterized
});

// ❌ UNSAFE: String concatenation (DON'T DO THIS)
// const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## 12. CORS Configuration

### Current Setup
- ✅ Configurable allowed origins
- ✅ Method restrictions
- ✅ Header restrictions
- ✅ Credentials support

### Configuration
```typescript
const corsConfig: CorsConfig = {
  allowedOrigins: [process.env.FRONTEND_URL],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
```

---

## 13. File Upload Security

### Validation
✅ File size limits
✅ MIME type validation
✅ Extension verification
✅ Filename sanitization
✅ Path traversal prevention
✅ Virus scanning (recommended)

### Usage
```typescript
import { sanitizeFileUpload } from '@/lib/security';

const validation = sanitizeFileUpload(
  fileName,
  fileSize,
  mimeType,
  {
    maxSize: 52428800, // 50MB
    allowedMimes: ['text/csv', 'application/vnd.ms-excel'],
    allowedExtensions: ['csv', 'xls', 'xlsx'],
  }
);

if (validation.valid) {
  // Safe to process
  await saveFile(validation.sanitizedName, fileData);
}
```

---

## 14. Testing Checklist

### Security Tests
- [ ] XSS attack attempts blocked
- [ ] SQL injection attempts blocked
- [ ] CSRF protection working
- [ ] Rate limiting enforced
- [ ] Unauthorized access denied
- [ ] Invalid input rejected
- [ ] Rate limit headers present
- [ ] Security headers present
- [ ] CORS properly configured
- [ ] Sensitive data masked in logs

### Compliance Tests
- [ ] GDPR right to be forgotten implemented
- [ ] Data export functionality working
- [ ] Audit logs immutable
- [ ] User consent logged
- [ ] Data minimization enforced

---

## 15. Deployment Checklist

Before deploying to production:

### Security
- [ ] All secrets in environment variables
- [ ] JWT_SECRET is 32+ random characters
- [ ] HTTPS enforced
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain
- [ ] Security headers verified

### Performance
- [ ] Database indexes created
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Compression enabled
- [ ] Database connection pooling configured

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Log aggregation setup
- [ ] Alerts configured

---

## 16. Quick Security Wins

Implement these for immediate security improvements:

1. **✅ Enable HTTPS Everywhere**
   ```
   Strict-Transport-Security: max-age=31536000
   ```

2. **✅ Add Security Headers**
   Already implemented in `lib/headers.ts`

3. **✅ Implement Rate Limiting**
   Already implemented in `lib/rate-limit.ts`

4. **✅ Use Strong CSP**
   Configured in `lib/headers.ts`

5. **✅ Validate All Input**
   Use `lib/validation.ts` and `lib/security.ts`

6. **✅ Log Security Events**
   Use `lib/audit.ts`

7. **✅ Implement Error Handling**
   Use `lib/errors.ts`

8. **✅ Apply Security Middleware**
   Auto-applied in `middleware.ts`

---

## 17. Resources and References

- OWASP Top 10 2021: https://owasp.org/www-project-top-ten/
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- AUTH0 Security Best Practices: https://auth0.com/blog/
- Zod Documentation: https://zod.dev/
- Prisma Security: https://www.prisma.io/docs/guides/security

---

## 18. Support & Escalation

For security issues:
1. Do NOT disclose publicly
2. Email: security@elegante.com
3. Include: Vulnerability details, attack vectors, potential impact
4. Follow: Coordinated disclosure best practices

---

**Last Updated:** February 23, 2024
**Status:** Security enhancements in progress (Phase 1 complete)
