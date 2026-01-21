/**
 * Auth Module
 * 
 * Public API for the authentication module
 * Other modules and API routes should import from this file
 */

// Domain
export { User } from './domain/entities/User';
export type { IUserRepository } from './domain/repositories/IUserRepository';
export { AuthService } from './domain/services/AuthService';

// Application
export { LoginUseCase } from './application/use-cases/LoginUseCase';
export { RegisterUseCase } from './application/use-cases/RegisterUseCase';
export { GetUserUseCase } from './application/use-cases/GetUserUseCase';

export type { LoginDto, LoginResult } from './application/dto/LoginDto';
export { LoginDtoSchema } from './application/dto/LoginDto';
export type { RegisterDto, RegisterResult } from './application/dto/RegisterDto';
export { RegisterDtoSchema } from './application/dto/RegisterDto';

// Infrastructure
export { SupabaseUserRepository } from './infrastructure/persistence/SupabaseUserRepository';
