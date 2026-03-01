import { z } from 'zod';

/**
 * Environment Configuration
 * 
 * Validates and provides type-safe access to environment variables
 */

/**
 * Environment Schema
 * Defines all required and optional environment variables
 */
const envSchema = z.object({
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

    // Email Configuration
    EMAIL_USER: z.string().email('Invalid email user'),
    EMAIL_PASSWORD: z.string().min(1, 'Email password is required'),

    // Application Configuration
    NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Optional: Feature Flags
    FEATURE_NEW_AUTH_MODULE: z.string().optional().transform(val => val === 'true'),
    FEATURE_NEW_TIMETABLE_MODULE: z.string().optional().transform(val => val === 'true'),

    // Optional: External Services
    SENTRY_DSN: z.string().url().optional(),
    ANALYTICS_ID: z.string().optional(),

    // Optional: AI/ML Configuration
    PYTHON_PATH: z.string().optional(),
    AI_MODEL_PATH: z.string().optional()
});

/**
 * Environment Type
 * Inferred from the schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate Environment Variables
 * Validates all environment variables against the schema
 * Throws an error if validation fails
 */
function validateEnv(): Env {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid environment variables:');
            error.issues.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            throw new Error('Invalid environment variables. Please check your .env file.');
        }
        throw error;
    }
}

/**
 * Validated Environment Variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

/**
 * Check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Get environment variable with fallback
 * 
 * @param key - Environment variable key
 * @param fallback - Fallback value if not found
 * @returns Environment variable value or fallback
 */
export function getEnv(key: string, fallback?: string): string | undefined {
    return process.env[key] || fallback;
}

/**
 * Require environment variable
 * Throws an error if not found
 * 
 * @param key - Environment variable key
 * @returns Environment variable value
 */
export function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
