/**
 * Database Types
 * 
 * This file contains TypeScript types for the database schema.
 * These types provide type safety when working with Supabase.
 */

// User Table Types
export type UserRow = {
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
    specialization: string | null;
    experience: number | null;
    student_id: string | null;
    roll_number: string | null;
    enrollment_year: number | null;
    course_id: string | null;
    current_semester: number | null;
    admission_year: number | null;
    is_active: boolean;
    avatar_url: string | null;
    token: string | null;
    last_login: string | null;
    created_at: string;
    updated_at: string;
};

export type UserInsert = Omit<UserRow, 'id' | 'created_at'>;
export type UserUpdate = Partial<UserInsert>;

// College Table Types
export type CollegeRow = {
    id: string;
    name: string;
    code: string;
    address: string;
    created_at: string;
    updated_at: string;
};

export type CollegeInsert = Omit<CollegeRow, 'id' | 'created_at' | 'updated_at'>;
export type CollegeUpdate = Partial<CollegeInsert>;

// Department Table Types
export type DepartmentRow = {
    id: string;
    name: string;
    code: string;
    college_id: string;
    created_at: string;
    updated_at: string;
};

export type DepartmentInsert = Omit<DepartmentRow, 'id' | 'created_at' | 'updated_at'>;
export type DepartmentUpdate = Partial<DepartmentInsert>;

// Batch Table Types
export type BatchRow = {
    id: string;
    name: string;
    department_id: string;
    year: number;
    semester: number;
    created_at: string;
    updated_at: string;
};

export type BatchInsert = Omit<BatchRow, 'id' | 'created_at' | 'updated_at'>;
export type BatchUpdate = Partial<BatchInsert>;

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
            batches: {
                Row: BatchRow;
                Insert: BatchInsert;
                Update: BatchUpdate;
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
