import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Database, UpdateDto } from '@/shared/database';
import { UserRole, FacultyType } from '@/shared/types';
import { withCacheAside } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';

/**
 * Supabase User Repository
 * 
 * Implements IUserRepository using Supabase
 */
export class SupabaseUserRepository implements IUserRepository {
    constructor(private readonly db: SupabaseClient) { }

    /**
     * Map database row to User entity
     */
    private mapToEntity(row: any): User {
        return new User(
            row.id,
            row.email,
            row.college_uid,
            row.password_hash,
            row.first_name,
            row.last_name,
            row.role as UserRole,
            row.college_id,
            row.department_id,
            row.faculty_type as FacultyType | null,
            row.student_id,
            row.course_id,
            row.current_semester,
            row.admission_year,
            row.is_active,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        return withCacheAside({ key: `user:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }

            return this.mapToEntity(data);
        });
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return withCacheAside({ key: `user:email:${email}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }

            return this.mapToEntity(data);
        });
    }

    /**
     * Find user by college UID
     */
    async findByCollegeUid(collegeUid: string): Promise<User | null> {
        return withCacheAside({ key: `user:uid:${collegeUid}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('college_uid', collegeUid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }

            return this.mapToEntity(data);
        });
    }

    /**
     * Find user by college UID - Direct (Skip Cache)
     * Used for login to avoid Redis latency overhead (~76ms saved)
     */
    async findByCollegeUidDirect(collegeUid: string): Promise<User | null> {
        const { data, error } = await this.db
            .from('users')
            .select('*')
            .eq('college_uid', collegeUid)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return this.mapToEntity(data);
    }

    /**
     * Find all users
     */
    async findAll(): Promise<User[]> {
        const { data, error } = await this.db
            .from('users')
            .select('*');

        if (error) throw error;

        return data.map((row: any) => this.mapToEntity(row));
    }

    /**
     * Find users by role
     */
    async findByRole(role: string): Promise<User[]> {
        const { data, error } = await this.db
            .from('users')
            .select('*')
            .eq('role', role);

        if (error) throw error;

        return data.map((row: any) => this.mapToEntity(row));
    }

    /**
     * Find users by college
     */
    async findByCollege(collegeId: string, roles?: string[]): Promise<User[]> {
        let query = this.db
            .from('users')
            .select('*')
            .eq('college_id', collegeId);

        if (roles && roles.length > 0) {
            query = query.in('role', roles);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data.map((row: any) => this.mapToEntity(row));
    }

    /**
     * Find users by department
     */
    async findByDepartment(departmentId: string): Promise<User[]> {
        const { data, error } = await this.db
            .from('users')
            .select('*')
            .eq('department_id', departmentId);

        if (error) throw error;

        return data.map((row: any) => this.mapToEntity(row));
    }

    /**
     * Create a new user
     */
    async create(user: Pick<User, 'email' | 'collegeUid' | 'passwordHash' | 'firstName' | 'lastName' | 'role' | 'collegeId' | 'departmentId' | 'facultyType' | 'isActive' | 'studentId' | 'courseId' | 'currentSemester' | 'admissionYear'>): Promise<User> {
        const { data, error } = await this.db
            .from('users')
            .insert({
                email: user.email,
                college_uid: user.collegeUid,
                password_hash: user.passwordHash,
                first_name: user.firstName,
                last_name: user.lastName,
                role: user.role,
                college_id: user.collegeId,
                faculty_type: user.facultyType,
                student_id: user.studentId,
                course_id: user.courseId,
                current_semester: user.currentSemester,
                admission_year: user.admissionYear,
                is_active: user.isActive
            })
            .select()
            .single();

        if (error) throw error;

        return this.mapToEntity(data);
    }

    /**
     * Update user
     */
    async update(id: string, data: Partial<User>): Promise<User> {
        const updateData: UpdateDto<'users'> = {};

        if (data.email) updateData.email = data.email;
        if (data.collegeUid) updateData.college_uid = data.collegeUid;
        if (data.firstName) updateData.first_name = data.firstName;
        if (data.lastName) updateData.last_name = data.lastName;
        if (data.passwordHash) updateData.password_hash = data.passwordHash;
        if (data.role) updateData.role = data.role;
        if (data.collegeId !== undefined) updateData.college_id = data.collegeId;
        if (data.departmentId !== undefined) updateData.department_id = data.departmentId;
        if (data.facultyType !== undefined) updateData.faculty_type = data.facultyType;

        // Always update updated_at
        updateData.updated_at = new Date().toISOString();

        const { data: result, error } = await this.db
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        if (result) {
            const keys = [
                `user:id:${id}`,
                `user:email:${result.email}`,
                `user:uid:${result.college_uid}`
            ];
            await Promise.all(keys.map(k => redisCache.del(k)));
        }

        return this.mapToEntity(result);
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
        const user = await this.findById(id);

        const { error } = await this.db
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (user) {
            const keys = [
                `user:id:${id}`,
                `user:email:${user.email}`,
                `user:uid:${user.collegeUid}`
            ];
            await Promise.all(keys.map(k => redisCache.del(k)));
        }

        return true;
    }

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user !== null;
    }

    /**
     * Count users by role
     */
    async countByRole(role: string): Promise<number> {
        const { count, error } = await this.db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', role);

        if (error) throw error;
        return count || 0;
    }

    /**
     * Count users by college
     */
    async countByCollege(collegeId: string): Promise<number> {
        const { count, error } = await this.db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('college_id', collegeId);

        if (error) throw error;
        return count || 0;
    }

    async findLatestStudent(collegeId: string): Promise<User | null> {
        const { data, error } = await this.db
            .from('users')
            .select('*')
            .eq('college_id', collegeId)
            .eq('role', 'student')
            .order('college_uid', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapToEntity(data);
    }

    /**
     * Update last login timestamp and session token
     */
    async updateLastLogin(id: string, token: string): Promise<void> {
        const { error } = await this.db
            .from('users')
            .update({
                last_login: new Date().toISOString(),
                token: token
            })
            .eq('id', id);

        if (error) throw error;
    }
}
