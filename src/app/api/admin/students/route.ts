import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { SupabaseDepartmentRepository } from '@/modules/department/infrastructure/persistence/SupabaseDepartmentRepository';
import { SupabaseCourseRepository } from '@/modules/college/infrastructure/persistence/SupabaseCourseRepository';
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
const courseRepository = new SupabaseCourseRepository(supabaseAdmin);
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
      // Super admin is always allowed, helper checks role
      return null;
    }

    // For read operations
    if (!requireAdmin) {
      // Allow admins and super admins
      if (user.isAdmin()) return user;

      // Allow faculty (creator/publisher)? 
      // Existing route seemed to check only for 'super_admin' or just college matching
      // But typically admins access this. 
      // We'll enforce Admin access for now as per "Migrate Admin Routes" context.
      // Although existing GET allows verifying based on college_id mostly?
      // Existing code check:
      // if (!decodedUser.college_id) error.
      // if (user.role === 'super_admin'...)
      // It doesn't explicitly block others but token decoding implies valid user.
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// GET - Fetch students
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

// ... (existing imports)

// GET - Fetch students
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return ApiResponse.unauthorized();
    }

    // Get college_id
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');

    // Pagination
    const { page, limit, isPaginated } = getPaginationParams(request);

    let targetCollegeId = user.collegeId;

    // Super admin can view any college's students
    if (user.isSuperAdmin() && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    if (!targetCollegeId) {
      return ApiResponse.badRequest('College ID is required');
    }

    // Optimized efficient fetch with embedded resources (Joins)
    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        department:departments(id, name, code),
        course:courses(id, title, code)
      `, { count: 'exact' })
      .eq('college_id', targetCollegeId)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      query = query.limit(500); // Safety cap for students list
    }

    const { data: studentsData, count, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Fetch batch enrollments for all students
    const studentIds = (studentsData || []).map((s: any) => s.id);
    let batchEnrollments: any[] = [];

    if (studentIds.length > 0) {
      const { data: enrollments } = await supabaseAdmin
        .from('student_batch_enrollment' as any)
        .select(`
          student_id,
          batch_id,
          is_active
        `)
        .in('student_id', studentIds)
        .eq('is_active', true);

      if (enrollments) {
        // Fetch batch details for active enrollments
        const batchIds = [...new Set(enrollments.map((e: any) => e.batch_id))];
        if (batchIds.length > 0) {
          const { data: batches } = await supabaseAdmin
            .from('batches')
            .select('id, name, semester, section, academic_year')
            .in('id', batchIds);

          // Create a map of batch_id to batch details
          const batchMap = new Map((batches || []).map((b: any) => [b.id, b]));

          // Combine enrollment with batch details
          batchEnrollments = enrollments.map((e: any) => ({
            ...e,
            batch: batchMap.get(e.batch_id) || null
          }));
        }
      }
    }

    // Create a map of student_id to their batch enrollment
    const studentBatchMap = new Map(
      batchEnrollments.map((e: any) => [e.student_id, e])
    );

    // Map response
    const mappedStudents = (studentsData || []).map((s: any) => {
      const dept = Array.isArray(s.department) ? s.department[0] : s.department;
      const course = Array.isArray(s.course) ? s.course[0] : s.course;
      const enrollment = studentBatchMap.get(s.id);

      return {
        id: s.id,
        email: s.email,
        college_uid: s.college_uid,
        first_name: s.first_name,
        last_name: s.last_name,
        role: s.role,
        college_id: s.college_id,
        department_id: s.department_id,
        student_id: s.student_id,
        course_id: s.course_id,
        current_semester: s.current_semester,
        admission_year: s.admission_year,
        is_active: s.is_active,
        created_at: s.created_at,
        updated_at: s.updated_at,

        departments: dept ? {
          id: dept.id,
          name: dept.name,
          code: dept.code
        } : null,
        courses: course ? {
          id: course.id,
          title: course.title,
          code: course.code
        } : null,
        batch_id: enrollment?.batch_id || null,
        batch: enrollment?.batch || null
      };
    });

    // Sort by created_at desc (already sorted in query, but defensive sort here kept if desired, though query sort is better)
    // Removed redundant JS sort for performance.

    let meta;
    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(mappedStudents, count || 0, page, limit);
      meta = paginatedResult.meta;
    } else {
      meta = {
        total: mappedStudents.length,
        page: 1,
        limit: 500
      };
    }

    return NextResponse.json({
      students: mappedStudents,
      meta
    });

  } catch (error: any) {
    return handleError(error);
  }
}

// POST - Create new student
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return ApiResponse.forbidden('Unauthorized');
    }

    if (!user.collegeId) {
      return ApiResponse.badRequest('College ID not found');
    }

    const body = await request.json();
    const { first_name, last_name, email, student_id, phone, password, current_semester, admission_year, course_id, department_id, batch_id, is_active } = body;

    // Validation
    if (!first_name || !last_name || !email || !course_id || !department_id || !password) {
      return ApiResponse.badRequest('Missing required fields');
    }

    // Determine College UID
    const existingStudent = await userRepository.findLatestStudent(user.collegeId);

    let nextNumber = 1;
    if (existingStudent && existingStudent.collegeUid) {
      const match = existingStudent.collegeUid.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const year = admission_year || new Date().getFullYear();
    const college_uid = `STUDENT${year}${String(nextNumber).padStart(3, '0')}`;

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create Student
    const newStudent = await userRepository.create({
      email,
      collegeUid: college_uid,
      passwordHash,
      firstName: first_name,
      lastName: last_name,
      role: UserRole.STUDENT,
      collegeId: user.collegeId,
      departmentId: department_id,
      courseId: course_id,
      currentSemester: current_semester || 1,
      admissionYear: year,
      studentId: student_id || null,
      isActive: is_active !== undefined ? is_active : true,
      // Fields not needed for student
      facultyType: null
    });

    // If batch_id is provided, create enrollment in student_batch_enrollment
    if (batch_id) {
      const { error: enrollmentError } = await supabaseAdmin
        .from('student_batch_enrollment' as any)
        .insert({
          student_id: newStudent.id,
          batch_id: batch_id,
          is_active: true,
          enrollment_date: new Date().toISOString().split('T')[0]
        } as any);

      if (enrollmentError) {
        console.error('Error creating batch enrollment:', enrollmentError);
        // Don't fail the whole request, student was created
      }
    }

    return ApiResponse.created({ student: newStudent.toJSON() });

  } catch (error: any) {
    return handleError(error);
  }
}
