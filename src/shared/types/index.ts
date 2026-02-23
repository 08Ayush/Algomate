/**
 * Shared Types
 * 
 * Type definitions used across the application
 */

export { UserRole, FacultyType } from './user';
export type {
    User,
    CreateUserDto,
    UpdateUserDto,
    AuthenticatedUser,
    UserProfile
} from './user';
export {
    isSuperAdmin,
    isCollegeAdmin,
    isAdmin,
    isFaculty,
    isStudent,
    isCreatorFaculty,
    isPublisherFaculty
} from './user';

export { HttpStatus, ApiErrorCode } from './api';
export type {
    ApiSuccessResponse,
    ApiErrorResponse,
    ApiResponse,
    PaginatedApiResponse,
    HttpMethod,
    QueryParams,
    RequestContext
} from './api';

export type {
    DeepPartial,
    DeepRequired,
    PartialBy,
    RequiredBy,
    Nullable,
    Optional,
    Maybe,
    AsyncFunction,
    ID,
    Timestamp,
    Email,
    URL,
    JSONValue,
    JSONObject,
    EnumValues,
    Constructor,
    Class,
    Awaited,
    Result,
    Option,
    Some,
    None
} from './common';
export { some, none, isSome, isNone } from './common';
