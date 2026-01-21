# Auth Module

## Overview

The Auth module handles all authentication and user management functionality in the application.

## Structure

```
src/modules/auth/
├── domain/
│   ├── entities/
│   │   └── User.ts              # User entity with business logic
│   ├── repositories/
│   │   └── IUserRepository.ts   # Repository interface
│   └── services/
│       └── AuthService.ts       # Authentication domain service
├── application/
│   ├── dto/
│   │   ├── LoginDto.ts          # Login data transfer object
│   │   └── RegisterDto.ts       # Register data transfer object
│   └── use-cases/
│       ├── LoginUseCase.ts      # Login use case
│       ├── RegisterUseCase.ts   # Register use case
│       └── GetUserUseCase.ts    # Get user use case
├── infrastructure/
│   └── persistence/
│       └── SupabaseUserRepository.ts  # Supabase implementation
└── index.ts                     # Public API
```

## Usage

### In API Routes

```typescript
import { LoginUseCase, SupabaseUserRepository, AuthService } from '@/modules/auth';
import { db } from '@/shared/database';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const repository = new SupabaseUserRepository(db);
  const authService = new AuthService();
  const useCase = new LoginUseCase(repository, authService);
  
  const result = await useCase.execute(body);
  
  return ApiResponse.success(result);
}
```

## Features

- ✅ User authentication (login/register)
- ✅ Password hashing with bcrypt
- ✅ Token generation
- ✅ Role-based access control
- ✅ Email validation
- ✅ Password strength validation

## Status

✅ **Complete** - Ready to use
