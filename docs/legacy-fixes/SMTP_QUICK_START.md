# 🚀 SMTP Quick Start Guide - PowerShell Edition

## Current Status
✅ Development server is running on `http://localhost:3000`  
❌ `.env` file not configured - **This is your next step!**

## Step 1: Create .env File (REQUIRED)

Run this in PowerShell:

```powershell
# Copy the example file to create your .env
Copy-Item .env.example .env

# Open it in VS Code
code .env
```

Or manually create a file named `.env` in your project root with this content:

```env
# SMTP Configuration - UPDATE THESE VALUES!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_NAME=Academic Compass
SMTP_FROM_EMAIL=noreply@academiccompass.edu

# Email Settings
EMAIL_ENABLED=true
EMAIL_QUEUE_ENABLED=true
EMAIL_RATE_LIMIT=50
EMAIL_BATCH_SIZE=10
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000

# College Information
COLLEGE_NAME=Government College of Education
COLLEGE_WEBSITE=https://gcoej.edu.in
COLLEGE_SUPPORT_EMAIL=support@gcoej.edu.in

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 2: Get Gmail App Password

### 2.1 Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the steps to enable it

### 2.2 Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. App name: **Academic Compass**
3. Click "Create"
4. Copy the **16-character password** (it looks like: `abcd efgh ijkl mnop`)

### 2.3 Update .env File
```env
SMTP_USER=your.actual.email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # Remove spaces from the 16-char password
```

## Step 3: Restart Development Server

After saving `.env`, restart your dev server:

```powershell
# Press Ctrl+C in the terminal running npm run dev
# Then restart:
npm run dev
```

## Step 4: Test Email Configuration (PowerShell Commands)

### Test 1: Check Configuration Status
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/email/test" -Method Get
```

**Expected Output:**
```json
{
  "configured": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "user": "your-email@gmail.com",
  "connection": "successful"
}
```

### Test 2: Send Test Email
```powershell
$body = @{
    to = "your-email@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/email/test" -Method Post -Body $body -ContentType "application/json"
```

**Expected Output:**
```json
{
  "success": true,
  "messageId": "<some-id@gmail.com>",
  "message": "Test email sent successfully"
}
```

## Step 5: Test in Browser

1. Open: http://localhost:3000/api/email/test
2. You should see the configuration status

To send a test email via browser console:
```javascript
fetch('/api/email/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'your-email@example.com' })
})
  .then(r => r.json())
  .then(console.log);
```

## Troubleshooting Common Issues

### Issue: "Invalid login: 535-5.7.8 Username and Password not accepted"
**Solution:** You're using your regular Gmail password. You MUST use an App-Specific Password (16 characters).

### Issue: "SMTP connection timeout"
**Solutions:**
- Check if you're behind a firewall/VPN
- Try port 465 with `SMTP_SECURE=true`
- Verify SMTP_HOST is correct

### Issue: "Module not found: Can't resolve..."
**Solution:** Restart the dev server after creating `.env`

### Issue: PowerShell curl command not working
**Solution:** Use `Invoke-RestMethod` or `Invoke-WebRequest` instead of `curl` in PowerShell.

## PowerShell Command Reference

### Basic GET Request
```powershell
Invoke-RestMethod -Uri "URL" -Method Get
```

### POST Request with JSON Body
```powershell
$body = @{ key = "value" } | ConvertTo-Json
Invoke-RestMethod -Uri "URL" -Method Post -Body $body -ContentType "application/json"
```

### View Full Response (including headers)
```powershell
Invoke-WebRequest -Uri "URL" -Method Get
```

## Quick Verification Checklist

- [ ] `.env` file created in project root
- [ ] Gmail 2FA enabled
- [ ] App-specific password generated (16 characters)
- [ ] `.env` file updated with actual email and password
- [ ] Dev server restarted after `.env` changes
- [ ] Test GET request successful
- [ ] Test POST request sends email
- [ ] Received test email in inbox

## Next Steps After Testing

Once email is working:

1. **Add Emergency Notifications Component to Admin Dashboard**
   ```tsx
   import EmergencyNotifications from '@/components/EmergencyNotifications';
   
   // In your admin dashboard page
   <EmergencyNotifications />
   ```

2. **Test Schedule Change Notification**
   - Login as admin/publisher
   - Use the Emergency Notifications form
   - Send a test schedule change to a batch

3. **Production Setup**
   - Sign up for SendGrid (recommended) or Mailgun
   - Update `.env` with production SMTP credentials
   - Set up SPF/DKIM records for your domain

## Support

If you're still having issues:
1. Check browser console (F12) for errors
2. Check terminal running `npm run dev` for server errors
3. Verify `.env` file is in the correct location (project root)
4. Make sure there are no typos in SMTP credentials

---

**Current System Status:**
- ✅ Email system code implemented
- ✅ Development server running
- ❌ SMTP credentials not configured
- ⏳ Waiting for `.env` file setup

**Your Next Action:** Create `.env` file and add your Gmail App Password!
