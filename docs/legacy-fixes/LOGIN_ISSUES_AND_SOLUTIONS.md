# 🐛 Login & Startup Issues Resolution Log

This document records the issues encountered during the implementation and debugging of the Authentication (Login/Register) flow and their respective solutions.

## 1. 🛑 Issue: 401 Unauthorized (Invalid College UID)

### **Symptoms**
- Login attempts failed immediately with `401 Unauthorized`.
- Error message: `Invalid College UID or password`.
- Logs showed the user was "not found" even when the UID was correct.

### **Root Cause**
- **Row Level Security (RLS):** The application was using the standard anonymous Supabase client (`db`) to query the `users` table.
- The `users` table has RLS policies that prevent anonymous/unauthenticated users from reading data.
- As a result, the `findByCollegeUid` query returned `null`, leading the code to believe the user did not exist.

### **✅ Solution**
- **Switch to Service Role:** Updated `src/app/api/auth/login/route.ts` and `src/app/api/auth/register/route.ts` to use `serviceDb` instead of `db`.
- `serviceDb` uses the `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS policies, allowing the backend to verify user credentials before a session is established.

```typescript
// Before
const repository = new SupabaseUserRepository(db);

// After
import { serviceDb } from '@/shared/database';
const repository = new SupabaseUserRepository(serviceDb);
```

---

## 2. 💥 Issue: 500 Internal Server Error (Missing Column)

### **Symptoms**
- Login logic proceeded past password verification but crashed during session creation.
- API Error Code: `PGRST204`
- Error Message: `Could not find the 'token' column of 'users' in the schema cache`.

### **Root Cause**
- **Schema Mismatch:** The code was updated to save a session `token` and `last_login` timestamp to the database upon successful login (to match legacy behavior).
- However, the `public.users` table in the database did not actually have `token` or `last_login` columns.

### **✅ Solution**
- **Process:** Created a SQL migration script to alter the table structure.
- **Script Location:** `docs/database/Fix_Missing_Token_Column.sql`
- **SQL executed:**
  ```sql
  ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz;
  ```

---

## 3. 🌐 Issue: Font Connection Failure

### **Symptoms**
- Application failed to start or crashed during development.
- Error: `issue establishing a connection while requesting https://fonts.googleapis.com/...`

### **Root Cause**
- **Network Blocking:** The `next/font/google` loader attempts to fetch font files from Google servers at build/runtime.
- Network restrictions or offline status prevented this connection.

### **✅ Solution**
- **Temporarily Disable Fonts:** Modified `src/app/api/layout.tsx` to comment out `Geist` font imports.
- Reverted to using system fonts (`antialiased`) to unblock development.

---

## 📝 Summary of Changes

| File | Status | Change |
|------|--------|--------|
| `src/app/api/auth/login/route.ts` | ✅ Fixed | Use `serviceDb` for RLS bypass |
| `src/app/api/auth/register/route.ts` | ✅ Fixed | Use `serviceDb` for RLS bypass |
| `src/modules/auth/infrastructure/persistence/SupabaseUserRepository.ts` | ✅ Fixed | Added `updateLastLogin` method |
| `src/modules/auth/application/use-cases/LoginUseCase.ts` | ✅ Fixed | Call `updateLastLogin` on success |
| `src/app/layout.tsx` | ⚠️ Temp Fix | Disabled Google Fonts |
| `docs/database/Fix_Missing_Token_Column.sql` | 🆕 Added | SQL Migration Script |
