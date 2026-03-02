/**
 * Database Module
 * 
 * Centralized database access layer for the application.
 * Provides database clients, types, and base repository pattern.
 */

export { db, serviceDb, supabase, supabaseAdmin, DatabaseClient, createServerClient, createBrowserClient } from './client';
export { BaseRepository } from './repository.base';
export type { Database, Tables, InsertDto, UpdateDto, DatabaseError } from './types';
