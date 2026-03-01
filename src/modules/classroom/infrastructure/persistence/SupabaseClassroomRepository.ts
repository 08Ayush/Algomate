import { SupabaseClient } from '@supabase/supabase-js';
import { IClassroomRepository } from '../../domain/repositories/IClassroomRepository';
import { Classroom } from '../../domain/entities/Classroom';

export class SupabaseClassroomRepository implements IClassroomRepository {
    constructor(private readonly db: SupabaseClient) { }

    async findById(id: string): Promise<Classroom | null> {
        const { data, error } = await this.db
            .from('classrooms')
            .select('*, departments(id, name, code)')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return Classroom.fromDatabase(data);
    }

    async findByCollegeId(collegeId: string, page?: number, limit?: number): Promise<{ items: Classroom[], total: number }> {
        let query = this.db
            .from('classrooms')
            .select('*, departments(id, name, code)', { count: 'exact' })
            .eq('college_id', collegeId)
            .order('name');

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        const items = (data || []).map(row => Classroom.fromDatabase(row));
        return { items, total: count || items.length };
    }

    async findByDepartmentId(departmentId: string, page?: number, limit?: number): Promise<{ items: Classroom[], total: number }> {
        let query = this.db
            .from('classrooms')
            .select('*, departments(id, name, code)', { count: 'exact' })
            .eq('department_id', departmentId)
            .order('name');

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        const items = (data || []).map(row => Classroom.fromDatabase(row));
        return { items, total: count || items.length };
    }

    async create(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt' | 'toJSON'>): Promise<Classroom> {
        const { data, error } = await this.db
            .from('classrooms')
            .insert({
                name: classroom.name,
                college_id: classroom.collegeId,
                department_id: classroom.departmentId,
                capacity: classroom.capacity,
                type: classroom.type,
                has_projector: classroom.hasProjector,
                has_computers: classroom.hasComputers,
                has_ac: classroom.hasAc,
                is_available: classroom.isAvailable
                // is_active removed as it does not exist in DB schema
            } as any)
            .select()
            .single();

        if (error) throw error;
        return Classroom.fromDatabase(data);
    }

    async update(id: string, data: Partial<Classroom>): Promise<Classroom> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.capacity !== undefined) updateData.capacity = data.capacity;
        if (data.type) updateData.type = data.type;
        if (data.hasProjector !== undefined) updateData.has_projector = data.hasProjector;
        if (data.hasComputers !== undefined) updateData.has_computers = data.hasComputers;
        if (data.hasAc !== undefined) updateData.has_ac = data.hasAc;
        if (data.isAvailable !== undefined) updateData.is_available = data.isAvailable;
        // is_active removed from update

        const { data: result, error } = await this.db
            .from('classrooms')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return Classroom.fromDatabase(result);
    }



    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('classrooms')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
