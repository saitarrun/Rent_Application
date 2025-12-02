# Developer Onboarding Checklist

## Before First Deployment

### Environment Setup
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Generate strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Never commit actual `.env` file to git
- [ ] Use different secrets for dev/staging/production

### Database
- [ ] Set up database (SQLite for dev, PostgreSQL for production)
- [ ] Run migrations: `npx prisma migrate dev`
- [ ] Verify database connectivity
- [ ] Create database backups

### Dependencies
- [ ] Backend: `cd backend && npm install`
- [ ] Frontend: `cd frontend && npm install`
- [ ] Check for security vulnerabilities: `npm audit`

### Testing
- [ ] Backend tests pass: `npm test`
- [ ] Frontend builds without errors: `npm run build`
- [ ] Test locally with `npm run dev`

---

## Development Guidelines

### Code Quality
- [ ] Follow TypeScript strict mode
- [ ] Use Zod for input validation
- [ ] Always handle errors properly
- [ ] Log significant operations
- [ ] Use constants for magic strings

### Security
- [ ] Never log sensitive data (passwords, keys)
- [ ] Validate all user inputs
- [ ] Use prepared statements (Prisma handles this)
- [ ] Check permissions before operations
- [ ] Sanitize error messages for production

### Backend Routes
- [ ] Use Zod schemas for validation
- [ ] Check role/permissions with middleware
- [ ] Return consistent error format
- [ ] Log important actions
- [ ] Handle edge cases

### Frontend Components
- [ ] Use ErrorBoundary at app root
- [ ] Handle loading and error states
- [ ] Show user-friendly error messages
- [ ] Use React Query for API calls
- [ ] Implement retry logic

---

## Debugging

### Backend Issues
```bash
# Enable debug logging
NODE_ENV=development LOG_LEVEL=debug npm run dev

# Check database
npx prisma studio

# View logs
tail -f logs/*.log

# Test endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/leases
```

### Frontend Issues
```bash
# Enable React Query devtools
# Check browser console for errors
# Use React Developer Tools extension
npm run dev  # Includes source maps
```

---

## Common Tasks

### Add New API Endpoint
1. Create route in `backend/src/routes/`
2. Define Zod validation schema
3. Check auth with `requireAuth` middleware
4. Check permissions/roles as needed
5. Validate request with Zod
6. Use centralized error handling
7. Return consistent response format
8. Add TypeScript types to `backend/src/types/`
9. Add API call to `frontend/src/lib/api.ts`
10. Create React component with error/loading states

### Fix a Bug
1. Create a test case that reproduces it
2. Review error logs for context
3. Use debugger or console.log strategically
4. Check database state if data-related
5. Verify changes don't break other features
6. Test on both dev networks (local & sepolia)

### Performance Issue
1. Check browser devtools network tab
2. Use React Query devtools to see caching
3. Check backend logs for slow queries
4. Profile with Chrome DevTools
5. Consider rate limiting adjustments
6. Review database indexes

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed by teammate
- [ ] No console errors or warnings
- [ ] Environment variables set correctly
- [ ] Database backups created
- [ ] Deployment plan documented

### Deployment
- [ ] Deploy backend first
- [ ] Verify health check endpoint
- [ ] Check database migrations ran
- [ ] Deploy frontend
- [ ] Clear browser cache
- [ ] Test critical flows

### Post-Deployment
- [ ] Monitor error logs for issues
- [ ] Check `/health` endpoint
- [ ] Verify API responses format
- [ ] Test key user flows
- [ ] Monitor performance metrics
- [ ] Update status page if applicable

---

## Communication

### Report Issues
When reporting a bug, include:
- [ ] Exact steps to reproduce
- [ ] Expected vs. actual behavior
- [ ] Screenshots/videos if UI related
- [ ] Browser/environment info
- [ ] Error message/stack trace
- [ ] Your wallet/account if applicable

### Code Review
When submitting code for review:
- [ ] Changes are focused (one feature per PR)
- [ ] Tests pass locally
- [ ] Code follows style guide
- [ ] No breaking changes (or documented)
- [ ] Documentation updated if needed
- [ ] Ready to merge comment

---

## Learning Resources

- **Rental Suite**: See `README.md`
- **Security**: See `SECURITY.md`
- **API Design**: See `QUICK_REFERENCE.md`
- **Troubleshooting**: See `QUICK_REFERENCE.md`
- **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- **Express**: [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- **React**: [React Documentation](https://react.dev/)

---

## Support & Questions

- **Backend Issues**: Check error logs → check database → review code
- **Frontend Issues**: Check console → use DevTools → check network tab
- **Deployment Issues**: Check health endpoint → check logs → verify config
- **General Questions**: Review documentation → ask team lead

---

**Last Updated**: November 23, 2025
**Version**: 1.0
