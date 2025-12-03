# 🔐 Login Credentials & Testing Guide

## ✅ **Admin User Created Successfully**

### Admin Login Credentials:
```
College UID: ADM000001
Password: admin123
Role: admin
Email: admin@academic.com
Department: Computer Science & Engineering
```

---

## 📋 **Available Test Users**

### 1. **Admin User**
- **College UID**: `ADM000001`
- **Password**: `admin123`
- **Role**: admin
- **Dashboard**: `/admin/dashboard`

### 2. **Faculty Users** (Sample)
- **College UID**: `CSE001` (Dr. Manoj Bramhe)
- **College UID**: `CSE002` (Dr. Sunil Wanjari)
- **College UID**: `CSE003` (Dr. Dipak Wajgi)
- **Password**: *(Need to be set if not already)*
- **Role**: faculty
- **Dashboard**: `/faculty/dashboard`

### 3. **Student Users**
- **College UID**: `STU001` (Paritosh Magare)
- **College UID**: `STU002` (Sneha Reddy)
- **College UID**: `STU003` (Yogeshvar Chaudhari)
- **Password**: *(Need to be set if not already)*
- **Role**: student
- **Dashboard**: `/student/dashboard`

---

## 🧪 **Testing Login**

### Method 1: Using the Web Interface
1. Open http://localhost:3000
2. Click "Sign In" or go to http://localhost:3000/login
3. Enter College UID: `ADM000001`
4. Enter Password: `admin123`
5. Click "Sign In"
6. You should be redirected to `/admin/dashboard`

### Method 2: Using the Test Script
```bash
node test-login-credentials.js
```

This script will:
- List all users in the database
- Test the admin login credentials
- Verify password hashing
- Check role assignments

---

## 🔧 **Creating Additional Users**

### Create Admin User
```bash
node create-admin.js
```

### Create Faculty/Student Users
Use the registration page at http://localhost:3000/register

---

## 🐛 **Troubleshooting**

### Error: "Invalid College UID or password"

**Possible Causes:**
1. **User doesn't exist** - Run `node test-login-credentials.js` to see all users
2. **Incorrect College UID** - College UIDs are case-sensitive
3. **User is inactive** - Check `is_active` field in database
4. **Password mismatch** - Password hash verification failed

**Solutions:**
1. Verify the user exists:
   ```bash
   node test-login-credentials.js
   ```

2. Create admin user if missing:
   ```bash
   node create-admin.js
   ```

3. Check user status in database:
   - Users must have `is_active = true`
   - Users must have `college_id` set
   - Users must have valid `department_id`

### Error: "null value in column 'college_id'"

**Solution:** 
The `create-admin.js` script has been updated to automatically fetch `college_id` from the department. Re-run:
```bash
node create-admin.js
```

### Error: "Cannot coerce the result to a single JSON object"

**Cause:** Multiple users with the same `college_uid`

**Solution:** Ensure College UIDs are unique in the database

---

## 📊 **Database Schema Requirements**

Users table must have:
- `id` (UUID, primary key)
- `college_uid` (VARCHAR, unique within college)
- `password_hash` (TEXT)
- `college_id` (UUID, not null)
- `department_id` (UUID, not null)
- `role` (ENUM: admin, faculty, student)
- `is_active` (BOOLEAN, default true)
- `email_verified` (BOOLEAN)

---

## 🚀 **Quick Start**

1. **Create Admin User**:
   ```bash
   node create-admin.js
   ```

2. **Test Login**:
   ```bash
   node test-login-credentials.js
   ```

3. **Login via Web**:
   - Go to http://localhost:3000/login
   - Use College UID: `ADM000001`
   - Use Password: `admin123`

4. **Success!** You should now be logged in as admin

---

## 📝 **Notes**

- All passwords are hashed using bcrypt with 12 salt rounds
- College UIDs are unique identifiers within a college
- Users are authenticated via College UID (not email)
- Sessions are currently stored in localStorage (for production, use proper session management)
- The admin user is created with full permissions

---

## 🔒 **Security Reminders**

⚠️ **For Production:**
1. Change default admin password immediately
2. Implement proper session management (JWT/Session tokens)
3. Add rate limiting to login endpoint
4. Enable email verification for new users
5. Implement password reset functionality
6. Add 2FA for admin accounts
7. Store sessions server-side or use HttpOnly cookies
8. Add CSRF protection
9. Implement account lockout after failed attempts
10. Use environment-specific passwords

---

## 📞 **Support**

If login issues persist:
1. Check browser console for errors
2. Check server logs (terminal running npm run dev)
3. Run test script to verify database state
4. Ensure Supabase connection is active
5. Verify environment variables are set correctly

---

**Last Updated:** October 9, 2025  
**Admin User Created:** ✅ Yes  
**Tested:** ✅ Password verification successful  
**Status:** ✅ Ready for use
