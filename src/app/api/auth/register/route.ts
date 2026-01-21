import { NextRequest, NextResponse } from 'next/server';
import { RegisterUseCase } from '@/modules/auth/application/use-cases/RegisterUseCase';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { AuthService } from '@/modules/auth/domain/services/AuthService';
import { db, serviceDb } from '@/shared/database';
import { handleError } from '@/shared/utils/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Dependencies
    // Use serviceDb (admin client) to check for existing users without RLS restrictions
    const repository = new SupabaseUserRepository(serviceDb);
    const authService = new AuthService();
    const useCase = new RegisterUseCase(repository, authService);

    // Execute logic
    const result = await useCase.execute({
      collegeUid: body.collegeUid,
      password: body.password,
      firstName: body.firstName, // Note: This might be lost if DTO doesn't propagate it to User creation
      lastName: body.lastName,   // Note: Same here
      department_id: body.department_id,
      role: body.role,
      faculty_type: body.faculty_type
    });

    // Legacy response format
    return NextResponse.json({
      message: 'User registered successfully',
      user: result.user
    });

  } catch (error) {
    return handleError(error);
  }
}