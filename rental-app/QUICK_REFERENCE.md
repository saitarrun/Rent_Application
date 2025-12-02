## Quick Reference: Robustness Features

### For Backend Developers

**Error Handling**
```typescript
import { AppError } from './middleware/errorHandler';

// Throw typed errors
throw new AppError(400, 'Invalid input', 'VALIDATION_ERROR');
```

**Logging**
```typescript
import { logger } from './lib/logger';

logger.info('User logged in', { userId: user.id });
logger.error('Database failed', error, { query: 'SELECT...' });
```

**Input Sanitization**
```typescript
import { sanitizeString, sanitizeEmail, sanitizeHexAddress } from './lib/sanitize';

const email = sanitizeEmail(req.body.email);
const address = sanitizeHexAddress(req.body.wallet);
```

**Health Check**
```bash
curl http://localhost:4000/health
# Returns: { status: 'healthy', checks: { database: 'ok', api: 'ok' }, ... }
```

---

### For Frontend Developers

**Error Boundary**
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

// Wraps entire app - catches React errors
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

**Retry Fetch**
```typescript
import { retryFetch } from './lib/retry';

const response = await retryFetch(
  'https://api.example.com/data',
  { method: 'GET' },
  { maxRetries: 3, initialDelay: 1000 }
);
```

**Global Error Handling**
```tsx
// In React Query mutations
const mutation = useMutation({
  mutationFn: api.updateProfile,
  onError: (error: any) => {
    const message = error.response?.data?.error?.message 
      || 'Operation failed. Please try again.';
    pushNotice('error', message);
  }
});
```

---

### Environment Variables

**Development**
```bash
NODE_ENV=development
LOG_LEVEL=debug
JWT_SECRET=dev-secret (at least 32 chars in production)
```

**Production**
```bash
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DATABASE_URL=postgres://...
```

---

### Monitoring Checklist

- [ ] Set up monitoring for `/health` endpoint
- [ ] Alert on high error rates (> 1% of requests)
- [ ] Monitor database response times
- [ ] Track JWT token refresh rates
- [ ] Monitor rate limit violations
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Alert on deployment failures

---

### API Response Examples

**Success**
```json
{
  "success": true,
  "data": { "id": "123", "name": "Lease" },
  "meta": {
    "timestamp": "2025-11-23T10:30:00Z",
    "version": "1.0"
  }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email" }
  },
  "meta": {
    "timestamp": "2025-11-23T10:30:00Z",
    "version": "1.0"
  }
}
```

---

### Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**: 
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1700000000 (unix timestamp)
- **Response on limit exceeded**: 429 status with retry info

---

### Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

### Troubleshooting

**Issue**: Environment variables not found
→ Check `.env` file exists and matches `.env.example`
→ Run: `validateEnv()` on startup

**Issue**: High error rates
→ Check logs: `tail -f logs/*.log` (if configured)
→ Check `/health` endpoint status
→ Review database connectivity

**Issue**: Rate limiting too strict
→ Adjust in `middleware/security.ts`
→ Consider IP whitelist for CI/CD

**Issue**: React app crashes silently
→ Check browser console for errors
→ Ensure ErrorBoundary wraps entire app
→ Check React dev tools for component errors
