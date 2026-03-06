# 🚀 Deployment Checklist - Algomate Production

> **Frontend:** Vercel  
> **Backend:** Railway (FastAPI Python)  
> **Database:** Neon PostgreSQL  
> **Cache:** Upstash Redis

---

## 📋 Pre-Deployment Checklist

### ✅ General Requirements
- [ ] Project builds successfully (`npm run build` completes without errors)
- [ ] All critical bugs fixed and tested
- [ ] Database migrations completed
- [ ] Environment variables documented
- [ ] Git repository up to date
- [ ] `.gitignore` properly configured (no secrets committed)
- [ ] Remove all `console.log` statements from production code
- [ ] Error handling implemented for all API routes
- [ ] Rate limiting configured (if needed)

---

## 🎯 Part 1: Database Setup (Neon)

### 1.1 Create Neon Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project: `algomate-production`
3. Select region closest to your users
4. Copy the connection string

### 1.2 Run Database Migrations
```bash
# Connect to your Neon database
psql "postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"

# Run migration files from /database folder in order
\i database/auth_setup.sql
\i database/complete_schema_with_permissions.sql
# ... run other required migration files
```

### 1.3 Set Up Database Indexes
```bash
# Run performance optimization scripts
\i database/01_performance_indexes.sql
\i database/02_query_optimizations.sql
```

**✅ Checkpoint:** Verify all tables exist:
```sql
\dt
SELECT COUNT(*) FROM users;
```

---

## 🐳 Part 2: Backend Deployment (Railway)

### 2.1 Prepare Python Backend
1. **Create `Procfile`** in project root:
```procfile
web: cd services/optimized && uvicorn api.routes:app --host 0.0.0.0 --port $PORT
```

2. **Create `runtime.txt`** (optional, specify Python version):
```
python-3.11.0
```

3. **Update `requirements.txt`** path:
```bash
# Copy the requirements file to root for Railway
cp services/optimized/requirements.txt ./requirements.txt
```

### 2.2 Deploy to Railway

#### Option A: Deploy via GitHub (Recommended)
1. Push code to GitHub repository
2. Go to [Railway](https://railway.app/)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect Python and use `Procfile`

#### Option B: Deploy via Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 2.3 Configure Railway Environment Variables
Add these variables in Railway dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://[YOUR_NEON_CONNECTION_STRING]` | From Neon dashboard |
| `SUPABASE_URL` | `[OPTIONAL]` | If using Supabase features |
| `SUPABASE_KEY` | `[OPTIONAL]` | If using Supabase features |
| `SCHEDULER_PROFILE` | `production` | Sets optimization profile |
| `PYTHONUNBUFFERED` | `1` | For better logging |
| `PORT` | `8001` | Railway auto-assigns, but backend expects 8001 |

### 2.4 Get Railway Backend URL
After deployment, Railway will provide a public URL:
```
https://your-app-name.railway.app
```

**✅ Checkpoint:** Test the backend:
```bash
curl https://your-app-name.railway.app/health
# Should return: {"status":"healthy","service":"Optimized Scheduler",...}
```

---

## 🌐 Part 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend for Vercel
1. Ensure `next.config.ts` is properly configured (already done ✅)
2. Update `package.json` scripts (already correct ✅)

### 3.2 Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)
1. Go to [Vercel](https://vercel.com/)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel auto-detects Next.js
5. Configure environment variables (see below)
6. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 3.3 Configure Vercel Environment Variables

**📝 CRITICAL:** Add these in Vercel Dashboard → Project Settings → Environment Variables

| Variable | Value | Production | Preview | Development |
|----------|-------|------------|---------|-------------|
| `DATABASE_URL` | `postgresql://[NEON_CONNECTION]` | ✅ | ✅ | ❌ |
| `SCHEDULER_API_URL` | `https://your-app.railway.app` | ✅ | ✅ | ❌ |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | ✅ | ✅ | ❌ |
| `UPSTASH_REDIS_REST_URL` | `[From Upstash Console]` | ✅ | ✅ | ❌ |
| `UPSTASH_REDIS_REST_TOKEN` | `[From Upstash Console]` | ✅ | ✅ | ❌ |
| `JWT_SECRET` | `[Generate strong secret]` | ✅ | ✅ | ❌ |
| `NEXTAUTH_SECRET` | `[Generate strong secret]` | ✅ | ✅ | ❌ |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | ✅ | ❌ | ❌ |
| `EMAIL_HOST` | `smtp.gmail.com` | ✅ | ✅ | ❌ |
| `EMAIL_PORT` | `587` | ✅ | ✅ | ❌ |
| `EMAIL_USER` | `your-email@gmail.com` | ✅ | ✅ | ❌ |
| `EMAIL_PASS` | `[App-specific password]` | ✅ | ✅ | ❌ |
| `EMAIL_FROM` | `Algomate <noreply@yourdomain.com>` | ✅ | ✅ | ❌ |

**Generate secrets:**
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### 3.4 Get Vercel Deployment URL
After deployment, Vercel provides:
- Production URL: `https://your-project.vercel.app`
- Custom domain (optional): `https://yourdomain.com`

**✅ Checkpoint:** Test the frontend:
```bash
curl https://your-project.vercel.app/api/health
```

---

## 🔗 Part 4: Connect Railway & Vercel

### 4.1 Update Railway CORS Settings
In your Python backend (`services/optimized/api/routes.py`), ensure CORS allows Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-project.vercel.app",  # Add this
        "https://yourdomain.com",            # Add custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Redeploy Railway** after updating CORS.

### 4.2 Update Vercel Environment Variable
1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Update `SCHEDULER_API_URL` = `https://your-app.railway.app`
4. Redeploy Vercel

### 4.3 Test the Connection
```bash
# From your local machine
curl -X POST https://your-project.vercel.app/api/scheduler/generate \
  -H "Content-Type: application/json" \
  -d '{"batch_id":"test-batch-id"}'
```

**Expected behavior:** Vercel frontend → proxies request → Railway backend → returns response

---

## 🔐 Part 5: Security Checklist

- [ ] All API routes have authentication checks
- [ ] JWT tokens properly validated
- [ ] Environment variables never exposed to client
- [ ] SQL injection prevention (parameterized queries ✅)
- [ ] CORS properly configured
- [ ] Rate limiting enabled on critical endpoints
- [ ] HTTPS enforced (Vercel & Railway do this automatically)
- [ ] Database credentials secured
- [ ] No sensitive data in logs
- [ ] `.env` files in `.gitignore` ✅

---

## 📊 Part 6: Monitoring & Observability

### 6.1 Set Up Vercel Analytics
1. Go to Vercel Dashboard → Analytics
2. Enable Web Analytics
3. Monitor: Performance, errors, page views

### 6.2 Set Up Railway Logs
```bash
# View live logs
railway logs

# Or in Railway Dashboard → Deployments → View Logs
```

### 6.3 Set Up Error Tracking (Optional)
Consider integrating:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Datadog** for full observability

### 6.4 Health Check Endpoints
Monitor these endpoints:
- Frontend: `https://your-domain.vercel.app/api/health`
- Backend: `https://your-app.railway.app/health`

---

## 🧪 Part 7: Post-Deployment Testing

### 7.1 Functional Testing
- [ ] User registration works
- [ ] Login/logout works
- [ ] All dashboards load correctly
- [ ] Timetable generation works
- [ ] Assignment creation/submission works
- [ ] Notifications are sent
- [ ] Database queries execute correctly

### 7.2 Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized (check with EXPLAIN)
- [ ] Images properly optimized
- [ ] No memory leaks

### 7.3 Load Testing (Optional)
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://your-project.vercel.app/api/health
```

---

## 🚨 Part 8: Rollback Plan

### If Deployment Fails:

**Vercel:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

**Railway:**
1. Go to Deployments tab
2. Select previous deployment
3. Click "Redeploy"

**Database:**
1. Restore from Neon backup
2. Go to Neon Dashboard → Backups
3. Select restore point

---

## 📝 Part 9: Domain & DNS (Optional)

### If using custom domain:

**For Vercel:**
1. Project Settings → Domains
2. Add your domain: `yourdomain.com`
3. Add DNS records at your registrar:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For Railway:**
1. Settings → Networking → Custom Domain
2. Add domain: `api.yourdomain.com`
3. Add DNS record:
   ```
   Type: CNAME
   Name: api
   Value: [Railway provides this]
   ```

---

## ✅ Final Checklist

- [ ] Database migrated and seeded
- [ ] Backend deployed on Railway with correct env vars
- [ ] Frontend deployed on Vercel with correct env vars
- [ ] CORS configured to allow Vercel → Railway communication
- [ ] `SCHEDULER_API_URL` points to Railway backend
- [ ] All health checks passing
- [ ] Authentication working
- [ ] Test user created and verified
- [ ] Monitoring/logging enabled
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## 📞 Support & Troubleshooting

### Common Issues:

**1. "Module not found: pg" error**
- ✅ **Fixed:** `next.config.ts` now has webpack config to exclude Node.js modules

**2. CORS errors (Vercel → Railway)**
- Update CORS origins in `services/optimized/api/routes.py`
- Redeploy Railway

**3. Database connection timeout**
- Check `DATABASE_URL` is correct in both Vercel & Railway
- Verify Neon database is active (not hibernated)

**4. Environment variables not loading**
- Redeploy after adding/changing env vars
- Check spelling and casing (case-sensitive)

**5. 500 errors on API routes**
- Check Railway logs: `railway logs`
- Check Vercel logs: Dashboard → Deployments → View Function Logs

---

## 🎉 Deployment Complete!

Your application should now be live at:
- **Frontend:** `https://your-project.vercel.app`
- **Backend API:** `https://your-app.railway.app`
- **API Docs:** `https://your-app.railway.app/docs`

**Next Steps:**
1. Set up continuous deployment (GitHub → auto-deploy)
2. Configure staging environment
3. Set up automated backups
4. Monitor error rates and performance
5. Plan for scaling (if needed)

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0
