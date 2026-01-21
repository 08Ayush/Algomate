# Modular Monolithic Architecture - Implementation Todos

> **Project**: Academic Compass - Smart Timetable Scheduler  
> **Architecture Pattern**: Modular Monolithic  
> **Goal**: Transform the current codebase into a well-structured modular monolith with clear boundaries, shared infrastructure, and independent modules

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Foundation & Shared Infrastructure](#phase-1-foundation--shared-infrastructure)
3. [Phase 2: Core Domain Modules](#phase-2-core-domain-modules)
4. [Phase 3: Feature Modules](#phase-3-feature-modules)
5. [Phase 4: Integration & Cross-Cutting Concerns](#phase-4-integration--cross-cutting-concerns)
6. [Phase 5: Testing & Quality Assurance](#phase-5-testing--quality-assurance)
7. [Phase 6: Documentation & Deployment](#phase-6-documentation--deployment)

---

## 🏗️ Architecture Overview

### Target Structure
```
src/
├── modules/                    # Domain-specific modules
│   ├── auth/                  # Authentication & Authorization
│   ├── college/               # College Management
│   ├── department/            # Department Management
│   ├── faculty/               # Faculty Management
│   ├── student/               # Student Management
│   ├── timetable/             # Timetable Generation & Management
│   ├── nep-curriculum/        # NEP 2020 Curriculum
│   ├── events/                # Event Management
│   └── notifications/         # Notification System
├── shared/                     # Shared infrastructure
│   ├── database/              # Database clients & utilities
│   ├── middleware/            # Common middleware
│   ├── utils/                 # Utility functions
│   ├── types/                 # Shared TypeScript types
│   ├── constants/             # Application constants
│   └── config/                # Configuration management
├── core/                       # Core business logic
│   ├── ai/                    # AI/ML algorithms
│   ├── scheduling/            # Scheduling algorithms
│   └── validation/            # Business rule validation
└── app/                        # Next.js App Router (UI Layer)
```

### Module Characteristics
- **Self-contained**: Each module has its own domain logic, types, and services
- **Clear boundaries**: Modules communicate through well-defined interfaces
- **Shared infrastructure**: Common utilities, database clients, and middleware
- **Layered architecture**: Presentation → Application → Domain → Infrastructure

---

## Phase 1: Foundation & Shared Infrastructure

### 1.1 Project Structure Setup

#### [ ] Create Base Directory Structure
- [ ] Create `src/modules/` directory
- [ ] Create `src/shared/` directory
- [ ] Create `src/core/` directory
- [ ] Create module subdirectories:
  - [ ] `src/modules/auth/`
  - [ ] `src/modules/college/`
  - [ ] `src/modules/department/`
  - [ ] `src/modules/faculty/`
  - [ ] `src/modules/student/`
  - [ ] `src/modules/timetable/`
  - [ ] `src/modules/nep-curriculum/`
  - [ ] `src/modules/events/`
  - [ ] `src/modules/notifications/`

#### [ ] Configure TypeScript Path Aliases
- [ ] Update `tsconfig.json` with path mappings:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/modules/*": ["./src/modules/*"],
        "@/shared/*": ["./src/shared/*"],
        "@/core/*": ["./src/core/*"],
        "@/app/*": ["./src/app/*"]
      }
    }
  }
  ```
- [ ] Test path alias resolution
- [ ] Update existing imports to use new aliases

### 1.2 Shared Infrastructure

#### [ ] Database Layer (`src/shared/database/`)
- [ ] Create `src/shared/database/client.ts`
  - [ ] Supabase client initialization
  - [ ] Connection pooling configuration
  - [ ] Error handling wrapper
- [ ] Create `src/shared/database/types.ts`
  - [ ] Database table types
  - [ ] Query result types
  - [ ] Database error types
- [ ] Create `src/shared/database/queries.ts`
  - [ ] Common query builders
  - [ ] Reusable query fragments
  - [ ] Transaction helpers
- [ ] Create `src/shared/database/migrations/`
  - [ ] Migration tracking system
  - [ ] Migration utilities

#### [ ] Middleware Layer (`src/shared/middleware/`)
- [ ] Move `src/lib/auth-middleware.ts` → `src/shared/middleware/auth.ts`
- [ ] Create `src/shared/middleware/error-handler.ts`
  - [ ] Global error handling
  - [ ] Error logging
  - [ ] Error response formatting
- [ ] Create `src/shared/middleware/validation.ts`
  - [ ] Request validation middleware
  - [ ] Schema validation utilities
- [ ] Create `src/shared/middleware/rate-limiting.ts`
  - [ ] API rate limiting
  - [ ] Per-user rate limits
- [ ] Create `src/shared/middleware/logging.ts`
  - [ ] Request/response logging
  - [ ] Performance monitoring
- [ ] Create `src/shared/middleware/cors.ts`
  - [ ] CORS configuration
  - [ ] Security headers

#### [ ] Utilities Layer (`src/shared/utils/`)
- [ ] Move `src/lib/utils.ts` → `src/shared/utils/common.ts`
- [ ] Create `src/shared/utils/date.ts`
  - [ ] Date formatting utilities
  - [ ] Timezone handling
  - [ ] Academic calendar helpers
- [ ] Create `src/shared/utils/validation.ts`
  - [ ] Input sanitization
  - [ ] Data validation helpers
- [ ] Create `src/shared/utils/crypto.ts`
  - [ ] Password hashing
  - [ ] Token generation
  - [ ] Encryption utilities
- [ ] Create `src/shared/utils/response.ts`
  - [ ] Standardized API responses
  - [ ] Success/error response builders
- [ ] Create `src/shared/utils/pagination.ts`
  - [ ] Pagination helpers
  - [ ] Cursor-based pagination

#### [ ] Types Layer (`src/shared/types/`)
- [ ] Create `src/shared/types/api.ts`
  - [ ] API request/response types
  - [ ] HTTP method types
  - [ ] Status code enums
- [ ] Create `src/shared/types/database.ts`
  - [ ] Database schema types
  - [ ] Table relationship types
- [ ] Create `src/shared/types/user.ts`
  - [ ] User role enums
  - [ ] User permission types
  - [ ] Authentication types
- [ ] Create `src/shared/types/common.ts`
  - [ ] Generic utility types
  - [ ] Common domain types

#### [ ] Constants Layer (`src/shared/constants/`)
- [ ] Create `src/shared/constants/roles.ts`
  - [ ] User role definitions
  - [ ] Role hierarchy
  - [ ] Permission mappings
- [ ] Create `src/shared/constants/routes.ts`
  - [ ] API route constants
  - [ ] Frontend route constants
- [ ] Create `src/shared/constants/errors.ts`
  - [ ] Error codes
  - [ ] Error messages
- [ ] Create `src/shared/constants/config.ts`
  - [ ] Application configuration
  - [ ] Feature flags

#### [ ] Configuration Layer (`src/shared/config/`)
- [ ] Create `src/shared/config/env.ts`
  - [ ] Environment variable validation
  - [ ] Type-safe environment access
- [ ] Create `src/shared/config/database.ts`
  - [ ] Database configuration
  - [ ] Connection settings
- [ ] Create `src/shared/config/email.ts`
  - [ ] Email service configuration
  - [ ] SMTP settings
- [ ] Create `src/shared/config/ai.ts`
  - [ ] AI/ML model configuration
  - [ ] Algorithm parameters

---

## Phase 2: Core Domain Modules

### 2.1 Authentication Module (`src/modules/auth/`)

#### [ ] Module Structure
```
src/modules/auth/
├── domain/
│   ├── entities/
│   │   ├── User.ts
│   │   └── Session.ts
│   ├── repositories/
│   │   └── UserRepository.ts
│   └── services/
│       ├── AuthService.ts
│       └── TokenService.ts
├── application/
│   ├── use-cases/
│   │   ├── LoginUseCase.ts
│   │   ├── RegisterUseCase.ts
│   │   ├── LogoutUseCase.ts
│   │   └── RefreshTokenUseCase.ts
│   └── dto/
│       ├── LoginDto.ts
│       └── RegisterDto.ts
├── infrastructure/
│   ├── persistence/
│   │   └── SupabaseUserRepository.ts
│   └── external/
│       └── JwtTokenService.ts
├── presentation/
│   └── api/
│       ├── login/route.ts
│       ├── register/route.ts
│       └── logout/route.ts
└── index.ts (public API)
```

#### [ ] Domain Layer
- [ ] Create `User` entity with business logic
- [ ] Create `Session` entity
- [ ] Define `IUserRepository` interface
- [ ] Create `AuthService` with authentication logic
- [ ] Create `TokenService` for JWT operations

#### [ ] Application Layer
- [ ] Implement `LoginUseCase`
  - [ ] Validate credentials
  - [ ] Generate tokens
  - [ ] Create session
- [ ] Implement `RegisterUseCase`
  - [ ] Validate registration data
  - [ ] Hash password
  - [ ] Create user account
- [ ] Implement `LogoutUseCase`
- [ ] Implement `RefreshTokenUseCase`
- [ ] Create DTOs for all use cases

#### [ ] Infrastructure Layer
- [ ] Implement `SupabaseUserRepository`
  - [ ] CRUD operations
  - [ ] Query methods
- [ ] Implement `JwtTokenService`
  - [ ] Token generation
  - [ ] Token validation
  - [ ] Token refresh

#### [ ] Presentation Layer
- [ ] Move `/api/auth/*` routes to module
- [ ] Implement API route handlers
- [ ] Add request validation
- [ ] Add error handling

#### [ ] Module Integration
- [ ] Create public module API (`index.ts`)
- [ ] Export only necessary interfaces
- [ ] Document module usage

### 2.2 College Module (`src/modules/college/`)

#### [ ] Module Structure
```
src/modules/college/
├── domain/
│   ├── entities/
│   │   └── College.ts
│   ├── repositories/
│   │   └── CollegeRepository.ts
│   └── services/
│       └── CollegeService.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateCollegeUseCase.ts
│   │   ├── UpdateCollegeUseCase.ts
│   │   ├── DeleteCollegeUseCase.ts
│   │   └── GetCollegeUseCase.ts
│   └── dto/
│       └── CollegeDto.ts
├── infrastructure/
│   └── persistence/
│       └── SupabaseCollegeRepository.ts
├── presentation/
│   └── api/
│       └── route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `College` entity
  - [ ] College validation rules
  - [ ] Business logic
- [ ] Define `ICollegeRepository` interface
- [ ] Create `CollegeService`

#### [ ] Application Layer
- [ ] Implement CRUD use cases
- [ ] Create DTOs
- [ ] Add validation logic

#### [ ] Infrastructure Layer
- [ ] Implement `SupabaseCollegeRepository`
- [ ] Add caching layer

#### [ ] Presentation Layer
- [ ] Create API routes
- [ ] Add authorization checks

### 2.3 Department Module (`src/modules/department/`)

#### [ ] Module Structure
```
src/modules/department/
├── domain/
│   ├── entities/
│   │   └── Department.ts
│   ├── repositories/
│   │   └── DepartmentRepository.ts
│   └── services/
│       └── DepartmentService.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateDepartmentUseCase.ts
│   │   ├── UpdateDepartmentUseCase.ts
│   │   ├── DeleteDepartmentUseCase.ts
│   │   └── GetDepartmentsByCollegeUseCase.ts
│   └── dto/
│       └── DepartmentDto.ts
├── infrastructure/
│   └── persistence/
│       └── SupabaseDepartmentRepository.ts
├── presentation/
│   └── api/
│       └── route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Department` entity
- [ ] Define repository interface
- [ ] Create service layer

#### [ ] Application Layer
- [ ] Implement use cases
- [ ] Create DTOs
- [ ] Add college-department relationship logic

#### [ ] Infrastructure Layer
- [ ] Implement repository
- [ ] Add filtering by college

#### [ ] Presentation Layer
- [ ] Create API routes
- [ ] Add department isolation logic

### 2.4 Faculty Module (`src/modules/faculty/`)

#### [ ] Module Structure
```
src/modules/faculty/
├── domain/
│   ├── entities/
│   │   ├── Faculty.ts
│   │   ├── FacultyQualification.ts
│   │   └── FacultyAvailability.ts
│   ├── repositories/
│   │   ├── FacultyRepository.ts
│   │   └── QualificationRepository.ts
│   ├── services/
│   │   ├── FacultyService.ts
│   │   └── QualificationService.ts
│   └── value-objects/
│       └── FacultyType.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateFacultyUseCase.ts
│   │   ├── AssignQualificationUseCase.ts
│   │   ├── SetAvailabilityUseCase.ts
│   │   └── GetFacultyByDepartmentUseCase.ts
│   └── dto/
│       ├── FacultyDto.ts
│       └── QualificationDto.ts
├── infrastructure/
│   └── persistence/
│       ├── SupabaseFacultyRepository.ts
│       └── SupabaseQualificationRepository.ts
├── presentation/
│   └── api/
│       ├── faculty/route.ts
│       └── qualifications/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Faculty` entity
  - [ ] Faculty type validation (creator, publisher, general, guest)
  - [ ] Business rules
- [ ] Create `FacultyQualification` entity
- [ ] Create `FacultyAvailability` entity
- [ ] Create `FacultyType` value object
- [ ] Define repository interfaces
- [ ] Create service layers

#### [ ] Application Layer
- [ ] Implement faculty management use cases
- [ ] Implement qualification management use cases
- [ ] Implement availability management use cases
- [ ] Create comprehensive DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repositories
- [ ] Add complex queries (faculty with qualifications)

#### [ ] Presentation Layer
- [ ] Move `/api/faculty/*` routes
- [ ] Add role-based access control

### 2.5 Student Module (`src/modules/student/`)

#### [ ] Module Structure
```
src/modules/student/
├── domain/
│   ├── entities/
│   │   ├── Student.ts
│   │   ├── Batch.ts
│   │   └── CourseSelection.ts
│   ├── repositories/
│   │   ├── StudentRepository.ts
│   │   └── CourseSelectionRepository.ts
│   └── services/
│       ├── StudentService.ts
│       └── EnrollmentService.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateStudentUseCase.ts
│   │   ├── SelectCourseUseCase.ts
│   │   ├── GetStudentDashboardUseCase.ts
│   │   └── GetStudentTimetableUseCase.ts
│   └── dto/
│       ├── StudentDto.ts
│       └── CourseSelectionDto.ts
├── infrastructure/
│   └── persistence/
│       ├── SupabaseStudentRepository.ts
│       └── SupabaseCourseSelectionRepository.ts
├── presentation/
│   └── api/
│       ├── students/route.ts
│       └── selections/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Student` entity
- [ ] Create `Batch` entity
- [ ] Create `CourseSelection` entity
- [ ] Define repository interfaces
- [ ] Create service layers

#### [ ] Application Layer
- [ ] Implement student management use cases
- [ ] Implement course selection use cases
- [ ] Implement dashboard use case
- [ ] Create DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repositories
- [ ] Add batch-student relationships

#### [ ] Presentation Layer
- [ ] Move `/api/student/*` routes
- [ ] Add student-specific authorization

### 2.6 Timetable Module (`src/modules/timetable/`)

#### [ ] Module Structure
```
src/modules/timetable/
├── domain/
│   ├── entities/
│   │   ├── Timetable.ts
│   │   ├── ScheduledClass.ts
│   │   ├── TimeSlot.ts
│   │   └── Classroom.ts
│   ├── repositories/
│   │   ├── TimetableRepository.ts
│   │   ├── ScheduledClassRepository.ts
│   │   └── ClassroomRepository.ts
│   ├── services/
│   │   ├── TimetableService.ts
│   │   ├── SchedulingService.ts
│   │   └── ConflictDetectionService.ts
│   └── value-objects/
│       ├── TimetableStatus.ts
│       └── DayOfWeek.ts
├── application/
│   ├── use-cases/
│   │   ├── GenerateTimetableUseCase.ts
│   │   ├── PublishTimetableUseCase.ts
│   │   ├── ValidateTimetableUseCase.ts
│   │   └── GetTimetableUseCase.ts
│   └── dto/
│       ├── TimetableDto.ts
│       └── ScheduledClassDto.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── SupabaseTimetableRepository.ts
│   │   └── SupabaseScheduledClassRepository.ts
│   └── external/
│       └── PythonAIService.ts
├── presentation/
│   └── api/
│       ├── timetables/route.ts
│       └── generate/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Timetable` entity
  - [ ] Validation rules
  - [ ] Status management
- [ ] Create `ScheduledClass` entity
- [ ] Create `TimeSlot` entity
- [ ] Create `Classroom` entity
- [ ] Create value objects
- [ ] Define repository interfaces
- [ ] Create service layers
  - [ ] Conflict detection logic
  - [ ] Scheduling rules

#### [ ] Application Layer
- [ ] Implement timetable generation use case
  - [ ] Integration with AI service
  - [ ] Validation logic
- [ ] Implement publish use case
  - [ ] Workflow approval
  - [ ] Notification triggers
- [ ] Implement validation use case
- [ ] Create comprehensive DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repositories
- [ ] Create `PythonAIService` adapter
  - [ ] Subprocess management
  - [ ] Error handling
  - [ ] Result parsing

#### [ ] Presentation Layer
- [ ] Move `/api/timetable/*` routes
- [ ] Add complex authorization (creator/publisher)

### 2.7 NEP Curriculum Module (`src/modules/nep-curriculum/`)

#### [ ] Module Structure
```
src/modules/nep-curriculum/
├── domain/
│   ├── entities/
│   │   ├── Subject.ts
│   │   ├── ElectiveBucket.ts
│   │   ├── Course.ts
│   │   └── SubjectContinuation.ts
│   ├── repositories/
│   │   ├── SubjectRepository.ts
│   │   ├── BucketRepository.ts
│   │   └── CourseRepository.ts
│   ├── services/
│   │   ├── NEPService.ts
│   │   ├── BucketService.ts
│   │   └── SubjectLockService.ts
│   └── value-objects/
│       ├── SubjectCategory.ts (MAJOR, MINOR, etc.)
│       └── SubjectType.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateBucketUseCase.ts
│   │   ├── AddSubjectToBucketUseCase.ts
│   │   ├── LockMajorSubjectUseCase.ts
│   │   ├── ValidateSubjectSelectionUseCase.ts
│   │   └── GetAvailableSubjectsUseCase.ts
│   └── dto/
│       ├── SubjectDto.ts
│       └── BucketDto.ts
├── infrastructure/
│   └── persistence/
│       ├── SupabaseSubjectRepository.ts
│       └── SupabaseBucketRepository.ts
├── presentation/
│   └── api/
│       ├── subjects/route.ts
│       ├── buckets/route.ts
│       └── nep-scheduler/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Subject` entity
  - [ ] NEP category validation
  - [ ] Subject type rules
- [ ] Create `ElectiveBucket` entity
  - [ ] Bucket constraints
  - [ ] Subject grouping logic
- [ ] Create `Course` entity
- [ ] Create `SubjectContinuation` entity
  - [ ] Domain progression rules
- [ ] Create value objects
- [ ] Define repository interfaces
- [ ] Create service layers
  - [ ] MAJOR lock logic
  - [ ] MINOR flexibility logic

#### [ ] Application Layer
- [ ] Implement bucket management use cases
- [ ] Implement subject lock use case
  - [ ] Semester 3 MAJOR lock
  - [ ] Validation rules
- [ ] Implement subject selection validation
  - [ ] Check lock status
  - [ ] Validate prerequisites
- [ ] Create DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repositories
- [ ] Add complex queries (buckets with subjects)

#### [ ] Presentation Layer
- [ ] Move `/api/admin/subjects/*` routes
- [ ] Move `/api/elective-buckets/*` routes
- [ ] Add NEP-specific authorization

### 2.8 Events Module (`src/modules/events/`)

#### [ ] Module Structure
```
src/modules/events/
├── domain/
│   ├── entities/
│   │   ├── Event.ts
│   │   └── EventRegistration.ts
│   ├── repositories/
│   │   ├── EventRepository.ts
│   │   └── RegistrationRepository.ts
│   └── services/
│       ├── EventService.ts
│       └── ConflictCheckService.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateEventUseCase.ts
│   │   ├── RegisterForEventUseCase.ts
│   │   └── CheckEventConflictsUseCase.ts
│   └── dto/
│       └── EventDto.ts
├── infrastructure/
│   └── persistence/
│       ├── SupabaseEventRepository.ts
│       └── SupabaseRegistrationRepository.ts
├── presentation/
│   └── api/
│       ├── events/route.ts
│       └── registrations/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Event` entity
  - [ ] Event validation
  - [ ] Capacity management
- [ ] Create `EventRegistration` entity
- [ ] Define repository interfaces
- [ ] Create service layers
  - [ ] Conflict detection with timetables

#### [ ] Application Layer
- [ ] Implement event management use cases
- [ ] Implement registration use cases
- [ ] Implement conflict checking
- [ ] Create DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repositories
- [ ] Add event-timetable conflict queries

#### [ ] Presentation Layer
- [ ] Move `/api/events/*` routes
- [ ] Add event authorization

### 2.9 Notifications Module (`src/modules/notifications/`)

#### [ ] Module Structure
```
src/modules/notifications/
├── domain/
│   ├── entities/
│   │   └── Notification.ts
│   ├── repositories/
│   │   └── NotificationRepository.ts
│   └── services/
│       ├── NotificationService.ts
│       └── EmailService.ts
├── application/
│   ├── use-cases/
│   │   ├── SendNotificationUseCase.ts
│   │   ├── SendEmailUseCase.ts
│   │   └── GetUserNotificationsUseCase.ts
│   └── dto/
│       └── NotificationDto.ts
├── infrastructure/
│   ├── persistence/
│   │   └── SupabaseNotificationRepository.ts
│   └── external/
│       └── NodemailerEmailService.ts
├── presentation/
│   └── api/
│       └── notifications/route.ts
└── index.ts
```

#### [ ] Domain Layer
- [ ] Create `Notification` entity
- [ ] Define repository interface
- [ ] Create service layers
  - [ ] Email templating
  - [ ] Notification routing

#### [ ] Application Layer
- [ ] Implement notification use cases
- [ ] Implement email use cases
- [ ] Create DTOs

#### [ ] Infrastructure Layer
- [ ] Implement repository
- [ ] Move email service from `src/services/email/`
- [ ] Add email templates

#### [ ] Presentation Layer
- [ ] Move `/api/notifications/*` routes

---

## Phase 3: Feature Modules

### 3.1 AI/ML Core (`src/core/ai/`)

#### [ ] Module Structure
```
src/core/ai/
├── algorithms/
│   ├── cp-sat/
│   │   ├── CPSATSolver.ts
│   │   └── ConstraintBuilder.ts
│   ├── genetic/
│   │   ├── GeneticAlgorithm.ts
│   │   └── FitnessCalculator.ts
│   └── reinforcement/
│       ├── RLAgent.ts
│       └── Environment.ts
├── services/
│   ├── AISchedulingService.ts
│   └── ModelTrainingService.ts
├── adapters/
│   └── PythonBridge.ts
└── index.ts
```

#### [ ] Implementation Tasks
- [ ] Move Python AI scripts to `src/core/ai/python/`
- [ ] Create TypeScript adapters for Python services
- [ ] Implement `AISchedulingService`
  - [ ] Coordinate CP-SAT, GA, and RL
  - [ ] Result aggregation
- [ ] Create `PythonBridge` adapter
  - [ ] Subprocess management
  - [ ] Data serialization
  - [ ] Error handling
- [ ] Add algorithm configuration
- [ ] Add model versioning

### 3.2 Scheduling Core (`src/core/scheduling/`)

#### [ ] Module Structure
```
src/core/scheduling/
├── constraints/
│   ├── HardConstraints.ts
│   ├── SoftConstraints.ts
│   └── ConstraintValidator.ts
├── rules/
│   ├── NEPRules.ts
│   ├── FacultyRules.ts
│   └── ClassroomRules.ts
├── services/
│   ├── ConstraintService.ts
│   └── ValidationService.ts
└── index.ts
```

#### [ ] Implementation Tasks
- [ ] Move constraint logic from `src/lib/constraintRules.ts`
- [ ] Create constraint validators
- [ ] Implement NEP-specific rules
- [ ] Create validation service
- [ ] Add constraint priority system

### 3.3 Validation Core (`src/core/validation/`)

#### [ ] Module Structure
```
src/core/validation/
├── schemas/
│   ├── UserSchema.ts
│   ├── TimetableSchema.ts
│   └── NEPSchema.ts
├── validators/
│   ├── InputValidator.ts
│   └── BusinessRuleValidator.ts
└── index.ts
```

#### [ ] Implementation Tasks
- [ ] Create validation schemas (Zod or similar)
- [ ] Implement input validators
- [ ] Implement business rule validators
- [ ] Add custom validation rules

---

## Phase 4: Integration & Cross-Cutting Concerns

### 4.1 Module Communication

#### [ ] Event-Driven Architecture
- [ ] Create `src/shared/events/EventBus.ts`
  - [ ] Event publisher
  - [ ] Event subscriber
  - [ ] Event types
- [ ] Define domain events:
  - [ ] `TimetablePublishedEvent`
  - [ ] `StudentEnrolledEvent`
  - [ ] `SubjectLockedEvent`
  - [ ] `EventCreatedEvent`
- [ ] Implement event handlers in modules
- [ ] Add event logging

#### [ ] Module Dependencies
- [ ] Create dependency injection container
- [ ] Define module interfaces
- [ ] Implement module registration
- [ ] Add circular dependency detection

### 4.2 Caching Strategy

#### [ ] Cache Layer (`src/shared/cache/`)
- [ ] Create `src/shared/cache/CacheService.ts`
  - [ ] In-memory caching
  - [ ] Cache invalidation
  - [ ] TTL management
- [ ] Implement caching for:
  - [ ] User sessions
  - [ ] Timetable queries
  - [ ] Department data
  - [ ] Faculty qualifications
- [ ] Add cache warming strategies

### 4.3 Logging & Monitoring

#### [ ] Logging System (`src/shared/logging/`)
- [ ] Create `src/shared/logging/Logger.ts`
  - [ ] Structured logging
  - [ ] Log levels
  - [ ] Log formatting
- [ ] Implement module-specific loggers
- [ ] Add request/response logging
- [ ] Add performance logging
- [ ] Create log aggregation

#### [ ] Monitoring
- [ ] Add performance metrics
- [ ] Create health check endpoints
- [ ] Add error tracking
- [ ] Implement alerting system

### 4.4 Security Enhancements

#### [ ] Security Layer (`src/shared/security/`)
- [ ] Create `src/shared/security/Authorization.ts`
  - [ ] Role-based access control (RBAC)
  - [ ] Permission checking
  - [ ] Resource-level authorization
- [ ] Create `src/shared/security/Encryption.ts`
  - [ ] Data encryption
  - [ ] Sensitive data handling
- [ ] Implement security middleware
  - [ ] CSRF protection
  - [ ] XSS prevention
  - [ ] SQL injection prevention
- [ ] Add audit logging for sensitive operations

### 4.5 API Gateway Pattern

#### [ ] API Gateway (`src/shared/gateway/`)
- [ ] Create `src/shared/gateway/APIGateway.ts`
  - [ ] Request routing
  - [ ] Response aggregation
  - [ ] Error handling
- [ ] Implement rate limiting
- [ ] Add request/response transformation
- [ ] Create API versioning strategy

---

## Phase 5: Testing & Quality Assurance

### 5.1 Unit Testing

#### [ ] Test Infrastructure
- [ ] Set up Jest/Vitest configuration
- [ ] Create test utilities
- [ ] Set up mocking framework
- [ ] Create test data factories

#### [ ] Module Tests
- [ ] Auth module unit tests
  - [ ] LoginUseCase tests
  - [ ] TokenService tests
  - [ ] UserRepository tests
- [ ] College module unit tests
- [ ] Department module unit tests
- [ ] Faculty module unit tests
- [ ] Student module unit tests
- [ ] Timetable module unit tests
  - [ ] Conflict detection tests
  - [ ] Scheduling logic tests
- [ ] NEP Curriculum module unit tests
  - [ ] MAJOR lock tests
  - [ ] Subject selection validation tests
- [ ] Events module unit tests
- [ ] Notifications module unit tests

#### [ ] Core Tests
- [ ] AI algorithm tests
- [ ] Scheduling constraint tests
- [ ] Validation tests

### 5.2 Integration Testing

#### [ ] Module Integration Tests
- [ ] Auth + User management integration
- [ ] Timetable + Faculty integration
- [ ] NEP + Student selection integration
- [ ] Events + Timetable conflict integration
- [ ] Notifications + Timetable publishing integration

#### [ ] Database Integration Tests
- [ ] Repository tests with real database
- [ ] Transaction tests
- [ ] Complex query tests

#### [ ] API Integration Tests
- [ ] End-to-end API tests
- [ ] Authentication flow tests
- [ ] Authorization tests

### 5.3 End-to-End Testing

#### [ ] E2E Test Scenarios
- [ ] User registration and login flow
- [ ] Admin creating college and departments
- [ ] Faculty creating timetable
- [ ] Student selecting NEP subjects
- [ ] Timetable publishing workflow
- [ ] Event creation and conflict detection

### 5.4 Performance Testing

#### [ ] Performance Tests
- [ ] Load testing for timetable generation
- [ ] Stress testing for concurrent users
- [ ] Database query optimization
- [ ] API response time benchmarks

### 5.5 Code Quality

#### [ ] Code Quality Tools
- [ ] Set up ESLint with strict rules
- [ ] Set up Prettier
- [ ] Add TypeScript strict mode
- [ ] Add pre-commit hooks (Husky)
- [ ] Set up SonarQube or similar

#### [ ] Code Review Checklist
- [ ] Module boundary violations
- [ ] Circular dependencies
- [ ] Proper error handling
- [ ] Security vulnerabilities
- [ ] Performance issues

---

## Phase 6: Documentation & Deployment

### 6.1 Documentation

#### [ ] Architecture Documentation
- [ ] Create `docs/ARCHITECTURE.md`
  - [ ] System overview
  - [ ] Module descriptions
  - [ ] Data flow diagrams
  - [ ] Sequence diagrams
- [ ] Create `docs/MODULE_GUIDE.md`
  - [ ] How to create new modules
  - [ ] Module structure conventions
  - [ ] Best practices
- [ ] Create `docs/API_DOCUMENTATION.md`
  - [ ] API endpoints by module
  - [ ] Request/response examples
  - [ ] Authentication guide

#### [ ] Module Documentation
- [ ] Document each module's public API
- [ ] Create README.md for each module
- [ ] Add inline code documentation
- [ ] Create usage examples

#### [ ] Developer Guide
- [ ] Create `docs/DEVELOPER_GUIDE.md`
  - [ ] Setup instructions
  - [ ] Development workflow
  - [ ] Testing guide
  - [ ] Debugging tips
- [ ] Create `docs/CONTRIBUTING.md`
  - [ ] Code style guide
  - [ ] Pull request process
  - [ ] Review guidelines

### 6.2 Migration Guide

#### [ ] Migration Documentation
- [ ] Create `docs/MIGRATION_GUIDE.md`
  - [ ] Step-by-step migration process
  - [ ] Breaking changes
  - [ ] Rollback procedures
- [ ] Create migration scripts
- [ ] Test migration in staging environment

### 6.3 Deployment

#### [ ] Deployment Preparation
- [ ] Update environment variables
- [ ] Create deployment scripts
- [ ] Set up CI/CD pipeline
  - [ ] Automated testing
  - [ ] Build process
  - [ ] Deployment automation
- [ ] Create rollback procedures

#### [ ] Production Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor performance
- [ ] Deploy to production
- [ ] Post-deployment verification

### 6.4 Monitoring & Maintenance

#### [ ] Production Monitoring
- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Set up performance monitoring
- [ ] Create alerting rules
- [ ] Set up log aggregation

#### [ ] Maintenance Plan
- [ ] Create maintenance schedule
- [ ] Plan for dependency updates
- [ ] Security patch process
- [ ] Performance optimization plan

---

## 📊 Progress Tracking

### Overall Progress
- [ ] Phase 1: Foundation & Shared Infrastructure (0%)
- [ ] Phase 2: Core Domain Modules (0%)
- [ ] Phase 3: Feature Modules (0%)
- [ ] Phase 4: Integration & Cross-Cutting Concerns (0%)
- [ ] Phase 5: Testing & Quality Assurance (0%)
- [ ] Phase 6: Documentation & Deployment (0%)

### Priority Levels
- 🔴 **Critical**: Must be completed for basic functionality
- 🟡 **High**: Important for production readiness
- 🟢 **Medium**: Enhances maintainability and scalability
- 🔵 **Low**: Nice to have, can be done later

### Estimated Timeline
- **Phase 1**: 2-3 weeks
- **Phase 2**: 4-6 weeks
- **Phase 3**: 2-3 weeks
- **Phase 4**: 2-3 weeks
- **Phase 5**: 3-4 weeks
- **Phase 6**: 1-2 weeks

**Total Estimated Time**: 14-21 weeks (3.5-5 months)

---

## 🎯 Success Criteria

### Technical Goals
- ✅ Clear module boundaries with no circular dependencies
- ✅ 80%+ code coverage with tests
- ✅ All modules follow consistent architecture patterns
- ✅ API response time < 200ms for 95% of requests
- ✅ Zero security vulnerabilities in production

### Business Goals
- ✅ Maintain all existing functionality
- ✅ Improve code maintainability
- ✅ Enable faster feature development
- ✅ Reduce bug count by 50%
- ✅ Improve onboarding time for new developers

### Quality Goals
- ✅ TypeScript strict mode enabled
- ✅ ESLint with zero warnings
- ✅ All public APIs documented
- ✅ Comprehensive test suite
- ✅ Performance benchmarks established

---

## 📝 Notes

### Design Principles
1. **Single Responsibility**: Each module handles one domain
2. **Dependency Inversion**: Depend on abstractions, not implementations
3. **Interface Segregation**: Small, focused interfaces
4. **Open/Closed**: Open for extension, closed for modification
5. **DRY**: Don't repeat yourself - use shared infrastructure

### Best Practices
- Use dependency injection for testability
- Implement repository pattern for data access
- Use DTOs for data transfer between layers
- Implement proper error handling at each layer
- Use events for cross-module communication
- Keep business logic in domain layer
- Use value objects for domain concepts

### Anti-Patterns to Avoid
- ❌ Direct database access from presentation layer
- ❌ Business logic in API routes
- ❌ Circular dependencies between modules
- ❌ Tight coupling between modules
- ❌ God objects or services
- ❌ Anemic domain models

---

## 🔗 Related Documentation

- [Current README.md](./README.md)
- [Database Schema](./database/README.md)
- [API Structure Guide](./src/app/STRUCTURE_GUIDE.md)
- [Email Notification Implementation](./SMTP_EMAIL_NOTIFICATION_IMPLEMENTATION.md)

---

**Last Updated**: 2026-01-21  
**Version**: 1.0.0  
**Status**: Planning Phase
