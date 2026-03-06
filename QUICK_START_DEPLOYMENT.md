# 🚀 Deployment Quick Start Guide

**Last Updated:** March 6, 2026  
**Status:** ✅ Ready to deploy with minor fixes

---

## 📦 What You Have

✅ **Build Status:** Successful (fixed Turbopack pg module errors)  
✅ **Architecture:** Next.js 15 (Frontend) + FastAPI (Backend)  
✅ **Database:** Neon PostgreSQL configured  
✅ **Deployment Targets:** Vercel (Frontend) + Railway (Backend)

---

## ⚡ Quick Deploy (15 minutes)

### Prerequisites Checklist
- [ ] GitHub repository with latest code
- [ ] Neon database created
- [ ] Vercel account created
- [ ] Railway account created
- [ ] Upstash Redis account created

---

## 🎯 5-Step Deployment

### Step 1: Fix Critical Issues (5 minutes)

**1.1 Update TypeScript Config**
```typescript
// next.config.ts
typescript: {
  ignoreBuildErrors: false, // ⚠️ Change from true to false
}
```

**1.2 Update CORS for Production**
```python
# services/optimized/api/routes.py - Line 186
allow_origins=[
    "http://localhost:3000",
    "https://your-project.vercel.app",  # ADD YOUR VERCEL URL
    "https://yourdomain.com",            # ADD CUSTOM DOMAIN
]
```

**1.3 Commit Changes**
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

### Step 2: Deploy Backend to Railway (3 minutes)

**2.1 Create New Project**
1. Go to [railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Python + Procfile ✅

**2.2 Add Environment Variables**
```bash
DATABASE_URL=postgresql://[YOUR_NEON_URL]
SCHEDULER_PROFILE=production
PYTHONUNBUFFERED=1
PORT=8001
```

**2.3 Get Railway URL**
```
https://your-app-production.railway.app
```

**2.4 Test Backend**
```bash
curl https://your-app-production.railway.app/health
# Expected: {"status":"healthy","service":"optimized-scheduler",...}
```

✅ **Railway deployed!**

---

### Step 3: Deploy Frontend to Vercel (3 minutes)

**3.1 Create New Project**
1. Go to [vercel.com](https://vercel.com/)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js ✅

**3.2 Add Environment Variables**

Copy from `.env.example` and update:

```bash
DATABASE_URL=postgresql://[YOUR_NEON_URL]
SCHEDULER_API_URL=https://your-app-production.railway.app
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
UPSTASH_REDIS_REST_URL=https://[YOUR_REDIS].upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
JWT_SECRET=generate_with_openssl
NEXTAUTH_SECRET=generate_with_openssl
NEXTAUTH_URL=https://your-project.vercel.app
```

**Generate secrets:**
```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

**3.3 Deploy**
Click "Deploy" → Wait 2-3 minutes

**3.4 Get Vercel URL**
```
https://your-project.vercel.app
```

✅ **Vercel deployed!**

---

### Step 4: Connect Railway & Vercel (2 minutes)

**4.1 Update Railway CORS**
```python
# services/optimized/api/routes.py
allow_origins=[
    "https://your-project.vercel.app",  # Your actual Vercel URL
]
```

**4.2 Redeploy Railway**
```bash
# In Railway dashboard: Deployments → Redeploy
```

**4.3 Update Vercel Environment Variable**
```
SCHEDULER_API_URL = https://your-app-production.railway.app
```

**4.4 Redeploy Vercel**
```bash
# Vercel auto-redeploys on git push, or manually trigger in dashboard
```

---

### Step 5: Verify Deployment (2 minutes)

**5.1 Test Health Endpoints**
```bash
# Frontend health
curl https://your-project.vercel.app/api/health

# Backend health (through frontend proxy)
curl https://your-project.vercel.app/api/scheduler/health
```

**5.2 Test Authentication**
1. Open browser: `https://your-project.vercel.app`
2. Try to register a new user
3. Try to login
4. Check if dashboard loads

**5.3 Test Backend Connection**
1. Go to Faculty Dashboard
2. Try to generate a timetable
3. Check Railway logs for request

---

## ✅ Deployment Complete!

Your application is now live at:
- **Frontend:** `https://your-project.vercel.app`
- **Backend:** `https://your-app-production.railway.app`
- **API Docs:** `https://your-app-production.railway.app/docs`

---

## 📊 Post-Deployment Monitoring (First 24 Hours)

### Check These Every Few Hours:

**Vercel:**
- Dashboard → Analytics → Error Rate
- Dashboard → Deployments → Function Logs
- Look for 500 errors

**Railway:**
- Dashboard → Deployments → Logs
- Look for errors or crashes
- Monitor memory usage

**Database:**
- Neon Dashboard → Operations
- Check connection count
- Monitor query performance

---

## 🚨 Common Issues & Fixes

### Issue 1: "CORS Error" in Browser Console
**Fix:**
```python
# Update Railway CORS, then redeploy
allow_origins=["https://your-actual-vercel-url.vercel.app"]
```

### Issue 2: "Network Error" when calling backend
**Fix:**
```bash
# Check SCHEDULER_API_URL in Vercel
# Should be: https://your-app.railway.app (no trailing slash)
```

### Issue 3: "Database Connection Timeout"
**Fix:**
```bash
# Check DATABASE_URL in both Vercel and Railway
# Make sure it ends with ?sslmode=require
```

### Issue 4: "TypeScript Build Errors"
**Fix:**
```typescript
// Temporarily set back to true if blocking deployment
typescript: {
  ignoreBuildErrors: true,
}
// Then fix errors after deployment
```

---

## 📚 Next Steps

### Week 1:
- [ ] Monitor error logs daily
- [ ] Fix any critical bugs
- [ ] Set up automated backups
- [ ] Configure custom domain (optional)

### Week 2-4:
- [ ] Add comprehensive tests
- [ ] Clean up ESLint warnings
- [ ] Implement rate limiting
- [ ] Set up staging environment

---

## 📖 Full Documentation

For detailed guides, see:
- **Deployment Checklist:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Production Readiness:** [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- **Railway ↔ Vercel Connection:** [CONNECTING_RAILWAY_VERCEL.md](./CONNECTING_RAILWAY_VERCEL.md)

---

## 🆘 Need Help?

**Check Logs:**
```bash
# Railway
railway logs

# Vercel (in dashboard)
Deployments → View Function Logs
```

**Rollback if Needed:**
- Vercel: Deployments → Previous → Promote to Production
- Railway: Deployments → Previous → Redeploy

---

## 🎉 Congratulations!

You've successfully deployed a full-stack Next.js + Python FastAPI application!

**Share Your Success:**
```
🚀 Just deployed Algomate to production!
Frontend: Vercel ✅
Backend: Railway ✅
Database: Neon ✅

#NextJS #FastAPI #Deployment
```

---

**Questions?** Check the troubleshooting section in [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
