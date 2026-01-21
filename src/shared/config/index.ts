/**
 * Shared Configuration
 * 
 * Application-wide configuration settings
 */

export {
    env,
    isDevelopment,
    isProduction,
    isTest,
    getEnv,
    requireEnv
} from './env';
export type { Env } from './env';

export {
    DATABASE_CONFIG,
    PAGINATION_CONFIG,
    CACHE_CONFIG,
    RLS_CONFIG
} from './database';
