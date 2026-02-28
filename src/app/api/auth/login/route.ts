import { NextRequest, NextResponse } from 'next/server';
import { LoginUseCase } from '@/modules/auth/application/use-cases/LoginUseCase';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { AuthService } from '@/modules/auth/domain/services/AuthService';
import { db, serviceDb } from '@/shared/database';
import { ApiResponse, handleError } from '@/shared/utils/response';
import { createClient } from '@/shared/database/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Dev-only mock auth fallback (enabled by env var)
    const mockEnabled = process.env.MOCK_AUTH === 'true' || process.env.SUPABASE_UNAVAILABLE === 'true';
    if (mockEnabled) {
      const allowed = new Map<string, { role: string; facultyType?: string; displayName?: string }>([
        ['CSE012', { role: 'faculty', facultyType: 'creator', displayName: 'Creator User' }],
        ['FSE01', { role: 'faculty', facultyType: 'general', displayName: 'Faculty User' }],
        ['ADM000001', { role: 'admin', displayName: 'Super Admin' }],
        ['SVPCETADM001', { role: 'college_admin', displayName: 'College Admin' }]
      ]);

      const { collegeUid, password } = body;
      if (allowed.has(collegeUid) && password === 'pass@123') {
        const info = allowed.get(collegeUid)!;
        const authService = new AuthService();

        const mockUser = {
          id: `mock-${collegeUid}`,
          email: `${collegeUid.toLowerCase()}@local.test`,
          college_uid: collegeUid,
          role: info.role,
          college_id: 'mock-college',
          department_id: null,
          faculty_type: info.facultyType || null,
          first_name: info.displayName || collegeUid,
          last_name: '',
          student_id: null,
          course_id: null,
          current_semester: null,
          admission_year: null,
          is_active: true
        } as any;

        const token = authService.generateToken({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          college_id: mockUser.college_id,
          department_id: null,
          faculty_type: mockUser.faculty_type
        });

        return NextResponse.json({
          message: 'Login successful (mock)',
          userData: mockUser,
          token
        });
      }
      return handleError(new Error('Invalid College UID or password'));
    }

    // Normal path: use real DB + usecase
    // Use serviceDb (admin client) to bypass RLS for user lookup during login
    const repository = new SupabaseUserRepository(serviceDb);
    const authService = new AuthService();
    const useCase = new LoginUseCase(repository, authService);

    const result = await useCase.execute({
      collegeUid: body.collegeUid,
      password: body.password
    });

    return NextResponse.json({
      message: 'Login successful',
      userData: result.user,
      token: result.token
    });

  } catch (error) {
    return handleError(error);
  }
}
