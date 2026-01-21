/**
 * Common Types
 * 
 * Generic utility types used across the application
 */

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Async function type
 */
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

/**
 * ID type (UUID string)
 */
export type ID = string;

/**
 * Timestamp type (ISO 8601 string)
 */
export type Timestamp = string;

/**
 * Email type
 */
export type Email = string;

/**
 * URL type
 */
export type URL = string;

/**
 * JSON value type
 */
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

/**
 * JSON object type
 */
export type JSONObject = { [key: string]: JSONValue };

/**
 * Enum values type
 */
export type EnumValues<T> = T[keyof T];

/**
 * Constructor type
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Class type
 */
export type Class<T = any> = Constructor<T>;

/**
 * Awaited type (for Promise unwrapping)
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E };

/**
 * Option type (similar to Rust's Option)
 */
export type Option<T> = Some<T> | None;

export interface Some<T> {
    type: 'some';
    value: T;
}

export interface None {
    type: 'none';
}

/**
 * Helper to create Some
 */
export function some<T>(value: T): Some<T> {
    return { type: 'some', value };
}

/**
 * Helper to create None
 */
export const none: None = { type: 'none' };

/**
 * Type guard for Some
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
    return option.type === 'some';
}

/**
 * Type guard for None
 */
export function isNone<T>(option: Option<T>): option is None {
    return option.type === 'none';
}
