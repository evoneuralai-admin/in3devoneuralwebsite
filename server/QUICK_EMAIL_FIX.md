# Quick Fix: Email Not Sending

## Problem
The email service is not sending emails because the SMTP password is not configured correctly.

## Solution

### Step 1: Get Gmail App Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Step Verification** (if not already enabled):
   - Go to Security → 2-Step Verification
   - Follow the setup process
3. **Generate App Password**:
   - Go to Security → 2-Step Verification
   - Scroll down and click "App passwords"
   - Select "Mail" as the app
   - Select "Other (Custom name)" as device
   - Enter "In3D.ai Email Service"
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Update .env File

Open `server/.env` and update these lines:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=evoneural.ai@gmail.com
SMTP_PASSWORD=your_16_character_app_password_here
```

**Important**: 
- Replace `your_16_character_app_password_here` with the actual 16-character app password (remove spaces)
- Use `evoneural.ai@gmail.com` as the SMTP_USER (the email that will send the emails)
- The recipient email (`evoneural.ai@gmail.com`) is already set in the code

### Step 3: Restart Server

After updating the `.env` file, restart your server:

```bash
cd server
npm run dev
```

### Step 4: Check Console

Look for these messages in the console:

✅ **Success**: 
```
✅ Email service is ready to send messages
📧 Configuration: { host: 'smtp.gmail.com', port: 587, ... }
```

❌ **Error**: 
```
❌ Email service configuration error: ...
```

### Common Issues

1. **"Invalid login" or "Authentication failed"**
   - Make sure you're using an App Password, not your regular Gmail password
   - Verify 2-Step Verification is enabled

2. **"Connection timeout"**
   - Check your internet connection
   - Verify firewall isn't blocking port 587
   - Try port 465 with `SMTP_SECURE=true`

3. **"Email service not configured"**
   - Check that `SMTP_USER` and `SMTP_PASSWORD` are set in `.env`
   - Make sure there are no extra spaces or quotes
   - Restart the server after changing `.env`

### Testing

1. Go to `/pricing` page
2. Click "Contact Now" on Enterprise plan
3. Fill out the form and submit
4. Check the server console for success/error messages
5. Check `evoneural.ai@gmail.com` inbox (and spam folder)

### Alternative: Use Different Email Provider

If Gmail doesn't work, you can use any SMTP provider. Update `.env`:

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-provider.com
SMTP_PASSWORD=your-password
```

