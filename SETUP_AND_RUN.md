# 🚀 Academic Campus 2025 - Setup & Run Guide

## Prerequisites

Before running this project, ensure you have:

- **Node.js** 20.x or higher
- **npm** or **yarn** package manager
- **Supabase** account with a configured project
- **Git** for version control

---

## 📦 Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd academic_campass_2025
```

### 2. Install Dependencies
```bash
npm install
```

**Note:** If you encounter any errors, try:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Redis for distributed rate limiting (production)
# REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=development
```

**Get your Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Navigate to Settings → API
4. Copy the Project URL and anon/service keys

### 4. Database Setup

Run the following SQL scripts in your Supabase SQL Editor:

**A. Add missing user columns:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS token text,
ADD COLUMN IF NOT EXISTS last_login timestamptz;
```

**B. Configure Row Level Security (RLS):**
Ensure your `users` table has appropriate RLS policies. The application uses the service role key to bypass RLS during authentication.

---

## 🏃 Running the Project

### Development Mode

```bash
npm run dev
```

The application will start on:
- **Local:** http://localhost:3000
- **Network:** http://YOUR_IP:3000

**Development Mode Features:**
- ✅ Hot module replacement
- ✅ Rate limiting disabled (for easier testing)
- ✅ Detailed error messages
- ✅ Fast refresh

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

**Production Mode Features:**
- ✅ Rate limiting enabled
- ✅ Optimized bundles
- ✅ Performance optimizations

---

## 🔧 Troubleshooting

### Issue 1: Build Manifest Error
```
Error: ENOENT: no such file or directory, build-manifest.json
```

**Solution:**
```bash
# Remove build cache
Remove-Item -Recurse -Force .next  # Windows
rm -rf .next                        # Mac/Linux

# Restart dev server
npm run dev
```

### Issue 2: Port Already in Use
```
Error: Port 3000 is already in use
```

**Solution:**
```bash
# Option 1: Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
PORT=3001 npm run dev
```

### Issue 3: Database Connection Errors

**Check:**
1. ✅ `.env` file exists with correct Supabase URLs
2. ✅ Supabase project is active (not paused)
3. ✅ Database migration scripts have been run

### Issue 4: Module Not Found Errors

**Solution:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

---

## 🧪 Testing

### Test Login Functionality
```bash
node test-login.js
```

### Run Unit Tests (if configured)
```bash
npm run test
```

---

## 📁 Project Structure

```
academic_campass_2025/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── modules/          # Domain modules (Auth, Timetable, etc.)
│   ├── shared/           # Shared utilities, database, cache
│   └── middleware.ts     # Global middleware (rate limiting)
├── docs/                 # Project documentation
├── __tests__/            # Test files
├── public/              # Static assets
└── .env                 # Environment variables (create this)
```

---

## 🔐 First-Time Login

### Create a Test User

Run this SQL in Supabase:

```sql
INSERT INTO public.users (
  email,
  college_uid,
  password_hash,
  first_name,
  last_name,
  role,
  is_active
) VALUES (
  'test@example.com',
  'TEST001',
  '$2b$10$EXAMPLE_HASH',  -- Replace with real bcrypt hash
  'Test',
  'User',
  'admin',
  true
);
```

**Generate password hash:**
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your_password', 10);
console.log(hash);
```

---

## 🚦 Development Workflow

1. **Start dev server:** `npm run dev`
2. **Make changes** - Hot reload automatically updates
3. **Test changes** - Use browser or test scripts
4. **Commit changes** - Git workflow
5. **Deploy** - Build and deploy to production

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Architecture](./docs/README.md)
- [API Documentation](http://localhost:3000/api-docs) (when running)

---

## 🆘 Need Help?

1. Check the [docs/](./docs) folder for detailed documentation
2. Review [walkthrough.md](./docs/walkthrough.md) for recent changes
3. Check [LOGIN_ISSUES_AND_SOLUTIONS.md](./docs/legacy-fixes/LOGIN_ISSUES_AND_SOLUTIONS.md)

---

## ✅ Quick Checklist

Before running the project, ensure:

- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with Supabase credentials
- [ ] Database migrations run in Supabase
- [ ] No other process using port 3000
- [ ] `.next` cache cleared (if upgrading from previous version)

**Once all checkmarks are done, run `npm run dev` and visit http://localhost:3000** 🎉
