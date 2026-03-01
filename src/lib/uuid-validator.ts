/**
 * UUID Validation Utility
 * Provides helper functions for validating UUID formats
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a properly formatted UUID
 * @param value - The string to validate
 * @returns true if the value is a valid UUID, false otherwise
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

/**
 * Validates and returns user data from localStorage
 * Automatically clears invalid user data
 * @returns Parsed user object if valid, null otherwise
 */
export function getValidatedUser(): any | null {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;

    const parsedUser = JSON.parse(userData);
    
    if (!parsedUser.id || !isValidUUID(parsedUser.id)) {
      console.warn('Invalid user ID format in localStorage, clearing user data');
      localStorage.removeItem('user');
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.removeItem('user');
    return null;
  }
}
