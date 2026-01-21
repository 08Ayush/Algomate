/**
 * Database Types
 * 
 * This file contains TypeScript types for the database schema.
 * These types provide type safety when working with Supabase.
 */

// Main database type definition
export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    password_hash: string;
                    role: 'super_admin' | 'college_admin' | 'admin' | 'faculty' | 'student';
                    college_id: string | null;
                    department_id: string | null;
                    faculty_type: 'creator' | 'publisher' | 'general' | 'guest' | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['users']['Insert']>;
            };
            colleges: {
                Row: {
                    id: string;
                    name: string;
                    code: string;
                    address: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['colleges']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['colleges']['Insert']>;
            };
            departments: {
                Row: {
                    id: string;
                    name: string;
                    code: string;
                    college_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Database['public']['Tables']['departments']['Insert']>;
            };
            // Add more tables as needed
        };
    };
};

/**
 * Helper type to get the Row type for a table
 * Usage: Tables<'users'> returns the users Row type
 */
export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

/**
 * Helper type to get the Insert DTO for a table
 * Usage: InsertDto<'users'> returns the users Insert type
 */
export type InsertDto<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

/**
 * Helper type to get the Update DTO for a table
 * Usage: UpdateDto<'users'> returns the users Update type
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
