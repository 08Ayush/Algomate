import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { SupabaseDepartmentRepository } from '@/modules/department/infrastructure/persistence/SupabaseDepartmentRepository';
import { AuthService } from '@/modules/auth/domain/services/AuthService';
import { handleError, ApiResponse } from '@/shared/utils/response';
import { UserRole, FacultyType } from '@/shared/types';
import { Database } from '@/shared/database';

// Create server-side supabase client with service role key
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Instantiate repositories and services
const userRepository = new SupabaseUserRepository(supabaseAdmin);
const departmentRepository = new SupabaseDepartmentRepository(supabaseAdmin);
const authService = new AuthService();

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = authService.decodeToken(token);
    if (!decoded || !decoded.id) {
      return null;
    }

    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      return null;
    }

    // For write operations, only allow admin/college_admin/super_admin
    if (requireAdmin && !user.isAdmin()) {
      return null;
    }

    // For read operations
    if (!requireAdmin) {
      if (!user.isAdmin() &&
        !(user.isFaculty() && (user.isCreatorFaculty() || user.isPublisherFaculty()))) {
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// GET - Fetch faculty for authenticated user's college
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return ApiResponse.unauthorized('Unauthorized. Please log in as an admin.');
    }

    // Get college_id
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');

    let targetCollegeId = user.collegeId;

    if (user.isSuperAdmin() && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    if (!targetCollegeId) {
      return ApiResponse.badRequest('College ID is required');
    }

    // Fetch users (Admin & Faculty)
    const users = await userRepository.findByCollege(targetCollegeId, ['admin', 'faculty']);

    // Fetch departments for mapping
    const departments = await departmentRepository.findByCollege(targetCollegeId);
    const departmentMap = new Map(departments.map(d => [d.id, { id: d.id, name: d.name, code: d.code }]));

    let filteredUsers = users;

    // Filter by department if restricted
    if (!user.isAdmin() && user.departmentId) {
      filteredUsers = users.filter(u => u.departmentId === user.departmentId);
    }

    // transform to response format (join department, map role)
    const mappedFaculty = filteredUsers.map(u => {
      const uJson = u.toJSON();

      // Add department info
      const dept = u.departmentId ? departmentMap.get(u.departmentId) : null;

      // Logic to show 'departments' object as in existing API (using join)
      // Existing API response: departments: { id, name, code }
      const userWithDept = {
        ...uJson,
        departments: dept || null
      };

      // Map faculty_type back to role for display
      if (u.role === UserRole.FACULTY && (u.facultyType === FacultyType.CREATOR || u.facultyType === FacultyType.PUBLISHER)) {
        userWithDept.role = u.facultyType;
      }

      return userWithDept;
    });

    // Sort by name (existing API: first_name)
    mappedFaculty.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

    return NextResponse.json({
      faculty: mappedFaculty
    });

  } catch (error: any) {
    return handleError(error);
  }
}

// POST - Create new faculty
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return ApiResponse.forbidden('Unauthorized. Only admins can create faculty members.');
    }

    if (!user.collegeId) {
      return ApiResponse.badRequest('User college ID missing');
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      faculty_type,
      department_id,
      is_active
    } = body;

    // Determine actual role/faculty_type
    let actualRole = role;
    let actualFacultyType = faculty_type || 'general';

    if (role === 'creator' || role === 'publisher') {
      actualRole = 'faculty';
      actualFacultyType = role;
    }

    // Validation
    if (!first_name || !last_name || !email || !department_id) {
      return ApiResponse.badRequest('First name, last name, email, and department are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiResponse.badRequest('Invalid email format');
    }

    // Check email existence
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return ApiResponse.conflict('Email already exists');
    }

    // Validate Department
    const department = await departmentRepository.findById(department_id);
    if (!department || department.collegeId !== user.collegeId) {
      return ApiResponse.badRequest('Department not found in your college');
    }

    // Generate college_uid
    const rolePrefix = actualRole === 'admin' ? 'ADM' : 'FAC';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    const college_uid = `${rolePrefix}${randomSuffix}`;

    // Default password
    const defaultPassword = 'faculty123';
    const passwordHash = await authService.hashPassword(defaultPassword);

    // Create User
    const newUser = await userRepository.create({
      email,
      collegeUid: college_uid,
      passwordHash,
      firstName: first_name,
      lastName: last_name,
      role: actualRole as UserRole,
      collegeId: user.collegeId,
      departmentId: department_id,
      facultyType: actualFacultyType as FacultyType,
      studentId: null,
      courseId: null,
      currentSemester: null,
      admissionYear: null,
      isActive: is_active !== undefined ? is_active : true
    });

    // Construct response
    const newUserJson = newUser.toJSON();
    const displayFaculty = {
      ...newUserJson,
      role: (newUser.role === UserRole.FACULTY &&
        (newUser.facultyType === FacultyType.CREATOR || newUser.facultyType === FacultyType.PUBLISHER))
        ? newUser.facultyType
        : newUser.role,
      departments: {
        id: department.id,
        name: department.name,
        code: department.code
      }
    };

    return ApiResponse.created({
      message: 'Faculty created successfully',
      faculty: displayFaculty,
      defaultPassword
    });

  } catch (error: any) {
    return handleError(error);
  }
}