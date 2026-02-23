/**
 * Database Configuration
 * 
 * Configuration for database connections and queries
 */

/**
 * Database Connection Configuration
 */
export const DATABASE_CONFIG = {
    /**
     * Maximum number of connections in the pool
     */
    maxConnections: 10,

    /**
     * Connection timeout in milliseconds
     */
    connectionTimeout: 10000,

    /**
     * Query timeout in milliseconds
     */
    queryTimeout: 30000,

    /**
     * Enable query logging in development
     */
    logQueries: process.env.NODE_ENV === 'development',

    /**
     * Enable slow query logging
     */
    logSlowQueries: true,

    /**
     * Slow query threshold in milliseconds
     */
    slowQueryThreshold: 1000
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION_CONFIG = {
    /**
     * Default page size
     */
    defaultLimit: 10,

    /**
     * Maximum page size
     */
    maxLimit: 100,

    /**
     * Minimum page size
     */
    minLimit: 1
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
    /**
     * Default TTL in seconds
     */
    defaultTTL: 300, // 5 minutes

    /**
     * User session TTL in seconds
     */
    sessionTTL: 3600, // 1 hour

    /**
     * Static data TTL in seconds
     */
    staticDataTTL: 86400, // 24 hours

    /**
     * Enable caching
     */
    enabled: process.env.NODE_ENV === 'production'
} as const;

/**
 * Row Level Security (RLS) Configuration
 */
export const RLS_CONFIG = {
    /**
     * Enable RLS for all tables
     */
    enabled: true,

    /**
     * Bypass RLS for service role
     */
    bypassForServiceRole: true
} as const;
