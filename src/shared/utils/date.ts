/**
 * Date Utilities
 * 
 * Helper functions for date formatting and manipulation
 */

/**
 * Format date to ISO string
 * 
 * @param date - Date to format
 * @returns ISO 8601 formatted string
 */
export function toISOString(date: Date): string {
    return date.toISOString();
}

/**
 * Format date to readable string
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * formatDate(new Date()); // "January 21, 2026"
 * ```
 */
export function formatDate(date: Date, locale: string = 'en-US'): string {
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date and time to readable string
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date and time string
 * 
 * @example
 * ```typescript
 * formatDateTime(new Date()); // "January 21, 2026, 1:35 AM"
 * ```
 */
export function formatDateTime(date: Date, locale: string = 'en-US'): string {
    return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

/**
 * Format time to readable string
 * 
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted time string
 * 
 * @example
 * ```typescript
 * formatTime(new Date()); // "1:35 AM"
 * ```
 */
export function formatTime(date: Date, locale: string = 'en-US'): string {
    return date.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit'
    });
}

/**
 * Parse ISO string to Date
 * 
 * @param isoString - ISO 8601 formatted string
 * @returns Date object
 */
export function parseISOString(isoString: string): Date {
    return new Date(isoString);
}

/**
 * Check if date is today
 * 
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/**
 * Check if date is in the past
 * 
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPast(date: Date): boolean {
    return date < new Date();
}

/**
 * Check if date is in the future
 * 
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFuture(date: Date): boolean {
    return date > new Date();
}

/**
 * Add days to a date
 * 
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Add months to a date
 * 
 * @param date - Starting date
 * @param months - Number of months to add
 * @returns New date with months added
 */
export function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

/**
 * Get start of day
 * 
 * @param date - Date to process
 * @returns Date set to start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Get end of day
 * 
 * @param date - Date to process
 * @returns Date set to end of day (23:59:59)
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Get difference in days between two dates
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Academic year helpers
 */
export const academicYear = {
    /**
     * Get current academic year
     * Academic year starts in July
     * 
     * @returns Academic year string (e.g., "2025-2026")
     */
    getCurrent(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // If before July, academic year is previous year
        if (month < 6) {
            return `${year - 1}-${year}`;
        }

        return `${year}-${year + 1}`;
    },

    /**
     * Get academic year for a specific date
     * 
     * @param date - Date to check
     * @returns Academic year string
     */
    getForDate(date: Date): string {
        const year = date.getFullYear();
        const month = date.getMonth();

        if (month < 6) {
            return `${year - 1}-${year}`;
        }

        return `${year}-${year + 1}`;
    }
};
