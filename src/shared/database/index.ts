/**
 * Database Module
 * 
 * Centralized database access layer for the application.
 * Provides database clients, types, and base repository pattern.
 */

export { db, serviceDb, DatabaseClient } from './client';
export { BaseRepository } from './repository.base';
export type { Database, Tables, InsertDto, UpdateDto, DatabaseError } from './types';
