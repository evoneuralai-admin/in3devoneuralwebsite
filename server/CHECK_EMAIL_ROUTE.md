# Email Route Troubleshooting

## Issue: 404 Error on `/api/email/contact`

The route is properly configured but the server needs to be restarted to register it.

## Quick Fix

1. **Stop the server** (Ctrl+C in the terminal)

2. **Restart the server**:
   ```bash
   cd server
   npm run dev
   ```

3. **Check the console output** for these messages:
   ```
   Email routes being initialized...
   ✅ Email routes mounted at /email
   📧 Email routes available:
      - GET  /api/email/test
      - POST /api/email/contact
   ```

4. **Test the route**:
   - Open browser: `http://localhost:5002/api/email/test`
   - Should return: `{"success":true,"message":"Email route is working!","timestamp":"..."}`

5. **If still getting 404**, check:
   - Server console for any import errors
   - That `server/src/routes/email.ts` exists
   - That `server/src/services/emailService.ts` exists
   - Server logs for "Email routes being initialized..."

## Verify Route Registration

Visit: `http://localhost:5002/api/routes`

This will show all registered routes. Look for:
- `POST /api/email/contact`
- `GET /api/email/test`

## Common Issues

1. **Server not restarted**: The route was added but server is running old code
2. **TypeScript compilation error**: Check server console for errors
3. **Import error**: Check that `emailService` is properly exported

## Route Path Structure

- Server mounts: `app.use('/api', apiRouter)`
- Router mounts: `router.use('/email', emailRoutes)`
- Full path: `/api/email/contact` ✅

