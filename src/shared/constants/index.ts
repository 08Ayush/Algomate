/**
 * Shared Constants
 * 
 * Application-wide constants
 */

export {
    ROLE_HIERARCHY,
    FACULTY_TYPE_HIERARCHY,
    ROLE_PERMISSIONS,
    FACULTY_TYPE_PERMISSIONS,
    ROLE_DISPLAY_NAMES,
    FACULTY_TYPE_DISPLAY_NAMES,
    hasPermission,
    hasFacultyPermission,
    hasRolePermission,
    hasFacultyTypePermission,
    getRoleDisplayName,
    getFacultyTypeDisplayName
} from './roles';

export {
    API_ROUTES,
    FRONTEND_ROUTES,
    getDefaultRouteForRole,
    isPublicRoute,
    isAdminRoute,
    isFacultyRoute,
    isStudentRoute
} from './routes';

export {
    ERROR_MESSAGES,
    VALIDATION_MESSAGES,
    BUSINESS_ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    getErrorMessage,
    getSuccessMessage
} from './errors';
