# Email Service Setup Guide

This guide explains how to configure the email service for the Enterprise contact form.

## Overview

The email service uses Nodemailer to send contact form submissions to `evoneural.ai@gmail.com` when users click "Contact Now" on the Enterprise plan.

## Configuration

### 1. Gmail Setup (Recommended)

For Gmail, you'll need to use an **App Password** instead of your regular password.

#### Steps:

1. **Enable 2-Step Verification** (if not already enabled):
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Follow the prompts to enable it

2. **Generate an App Password**:
   - Go to Google Account → Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Enter "In3D.ai Email Service" as the name
   - Click "Generate"
   - Copy the 16-character password (you'll use this in the `.env` file)

3. **Add Environment Variables**:

Add these to your `server/.env` file:

```env
# Email Service Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=evoneural.ai@gmail.com
SMTP_PASSWORD=your_16_character_app_password_here
```

### 2. Alternative Email Providers

If you're using a different email provider, adjust the SMTP settings:

#### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### Custom SMTP Server:
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
```

## Testing

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Check the console for:
   - ✅ `Email service is ready to send messages` (if configured correctly)
   - ⚠️ `Email service not configured` (if credentials are missing)

3. Test the contact form:
   - Navigate to `/pricing` page
   - Click "Contact Now" on the Enterprise plan
   - Fill out and submit the form
   - Check `evoneural.ai@gmail.com` for the email

## Troubleshooting

### Email service not configured
- **Issue**: Console shows "Email service not configured"
- **Solution**: Make sure `SMTP_USER` and `SMTP_PASSWORD` are set in `server/.env`

### Authentication failed
- **Issue**: "Invalid login" or "Authentication failed" error
- **Solution**: 
  - For Gmail: Use an App Password, not your regular password
  - Make sure 2-Step Verification is enabled
  - Check that the email and password are correct

### Connection timeout
- **Issue**: "Connection timeout" error
- **Solution**:
  - Check your firewall settings
  - Verify SMTP_HOST and SMTP_PORT are correct
  - Try using port 465 with SMTP_SECURE=true

### Emails not received
- **Issue**: Form submits successfully but no email received
- **Solution**:
  - Check spam/junk folder
  - Verify the recipient email (`evoneural.ai@gmail.com`) in `emailService.ts`
  - Check server logs for errors
  - Verify SMTP credentials are correct

## Security Notes

- **Never commit** `.env` files to version control
- Use App Passwords for Gmail instead of your main password
- Keep your SMTP credentials secure
- Consider using environment variables in production (e.g., Vercel, Netlify, etc.)

## Production Deployment

For production, set these environment variables in your hosting platform:

- **Vercel**: Add in Project Settings → Environment Variables
- **Netlify**: Add in Site Settings → Environment Variables
- **Firebase Functions**: Add in Firebase Console → Functions → Configuration

Make sure to set them for the **production** environment.

