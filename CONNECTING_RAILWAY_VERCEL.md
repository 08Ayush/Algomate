# Quick Reference: Connecting Railway and Vercel

## 🔗 How They Connect

```
User Browser
    ↓
Vercel (Next.js Frontend)
    ↓ HTTP Request to /api/scheduler/*
Next.js API Route (proxy)
    ↓ HTTP Request via SCHEDULER_API_URL
Railway (FastAPI Backend)
    ↓ Database Query
Neon PostgreSQL
```

## 📝 Step-by-Step Connection

### 1. Deploy Backend to Railway First
```bash
railway up
```
Copy the Railway URL: `https://your-app.railway.app`

### 2. Update Frontend Environment Variable
In Vercel Dashboard:
```
SCHEDULER_API_URL = https://your-app.railway.app
```

### 3. Update Backend CORS
In `services/optimized/api/routes.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.vercel.app",  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Test Connection
```bash
# Should return backend health status
curl https://your-project.vercel.app/api/scheduler/health
```

## ⚠️ Common Issues

**CORS Error:**
- Update Railway CORS to include Vercel domain
- Redeploy Railway

**404 Not Found:**
- Check SCHEDULER_API_URL is correct in Vercel
- Verify Railway deployment is running

**Connection Timeout:**
- Check Railway logs: `railway logs`
- Verify Railway service is not sleeping (free tier)
