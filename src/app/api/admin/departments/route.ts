import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { SupabaseDepartmentRepository } from '@/modules/department/infrastructure/persistence/SupabaseDepartmentRepository';
import { CreateDepartmentUseCase } from '@/modules/department/application/use-cases/CreateDepartmentUseCase';
import { GetDepartmentsByCollegeUseCase } from '@/modules/department/application/use-cases/GetDepartmentsByCollegeUseCase';
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

// Use Cases
const createDepartmentUseCase = new CreateDepartmentUseCase(departmentRepository);
const getDepartmentsByCollegeUseCase = new GetDepartmentsByCollegeUseCase(departmentRepository);

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Decode token to get user ID
    // In legacy Auth, this is a base64 encoded JSON
    const decoded = authService.decodeToken(token);
    if (!decoded || !decoded.id) {
      return null;
    }

    // Verify user exists and is active using Repository
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

import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';

// ... (existing imports)

// GET - Fetch departments for authenticated user's college
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return ApiResponse.unauthorized('Unauthorized. Please log in with appropriate permissions.');
    }

    // Get college_id from query parameter (for super_admin) or use user's college_id
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');

    // Pagination
    const { page, limit } = getPaginationParams(request);

    let targetCollegeId = user.collegeId;

    // Super admin can view any college's departments
    if (user.isSuperAdmin() && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    if (!targetCollegeId) {
      return ApiResponse.badRequest('College ID is required');
    }

    // Execute Use Case
    const result = await getDepartmentsByCollegeUseCase.execute(targetCollegeId, page, limit);

    const paginated = createPaginatedResponse(result.departments, result.total, page, limit);

    // Return with "departments" key to match legacy response structure
    return NextResponse.json({
      departments: paginated.data,
      meta: paginated.meta
    });

  } catch (error: any) {
    return handleError(error);
  }
}

// POST - Create new department
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - only admins can create departments
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return ApiResponse.forbidden('Unauthorized. Only admins can create departments.');
    }

    const body = await request.json();

    // Mapping body to DTO
    // Note: The use case expects snake_case for college_id if we use the interface directly, 
    // but DTO validation handles it.
    // However, we need to ensure college_id is set.
    // If user is Admin/CollegeAdmin, we use their college_id.
    // If SuperAdmin, they might provide it in body? 
    // Existing code: college_id: user.college_id.

    if (!user.collegeId) {
      // Should not happen for Admin/CollegeAdmin but check to be safe
      return ApiResponse.badRequest('User does not have a valid college ID');
    }

    const { name, code, description } = body;

    // Use Case Execution
    const newDept = await createDepartmentUseCase.execute({
      name,
      code: code?.toUpperCase(), // Ensure uppercase as per legacy
      description,
      college_id: user.collegeId
    });

    // Return with "department" key to match legacy response structure
    return ApiResponse.created({ department: newDept });

  } catch (error: any) {
    return handleError(error);
  }
}