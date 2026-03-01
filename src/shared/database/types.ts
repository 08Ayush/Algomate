/**
 * Database Types
 * 
 * This file contains TypeScript types for the database schema.
 * These types provide type safety when working with Supabase.
 */

// User Table Types
export interface UserRow {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: 'super_admin' | 'college_admin' | 'admin' | 'faculty' | 'student';
    college_id: string | null;
    college_uid: string;
    department_id: string | null;
    faculty_type: 'creator' | 'publisher' | 'general' | 'guest' | null;
    student_id: string | null;
    course_id: string | null;
    current_semester: number | null;
    admission_year: number | null;
    is_active: boolean;
    avatar_url: string | null;
    token: string | null;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserInsert extends Omit<UserRow, 'id' | 'created_at'> { }
export interface UserUpdate extends Partial<UserInsert> { }

// College Table Types
export interface CollegeRow {
    id: string;
    name: string;
    code: string;
    address: string;
    created_at: string;
    updated_at: string;
}

export interface CollegeInsert extends Omit<CollegeRow, 'id' | 'created_at' | 'updated_at'> { }
export interface CollegeUpdate extends Partial<CollegeInsert> { }

// Department Table Types
export interface DepartmentRow {
    id: string;
    name: string;
    code: string;
    college_id: string;
    created_at: string;
    updated_at: string;
}

export interface DepartmentInsert extends Omit<DepartmentRow, 'id' | 'created_at' | 'updated_at'> { }
export interface DepartmentUpdate extends Partial<DepartmentInsert> { }

// Main database type definition
export type Database = {
    public: {
        Tables: {
            users: {
                Row: UserRow;
                Insert: UserInsert;
                Update: UserUpdate;
            };
            colleges: {
                Row: CollegeRow;
                Insert: CollegeInsert;
                Update: CollegeUpdate;
            };
            departments: {
                Row: DepartmentRow;
                Insert: DepartmentInsert;
                Update: DepartmentUpdate;
            };
            // Add more tables as needed
        };
    };
};

/**
 * Helper type to get the Row type for a table
 */
export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

/**
 * Helper type to get the Insert DTO for a table
 */
export type InsertDto<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

/**
 * Helper type to get the Update DTO for a table
 */
export type UpdateDto<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];

/**
 * Database error type
 */
export interface DatabaseError {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}
