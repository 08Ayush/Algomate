import { SupabaseClient } from '@supabase/supabase-js';
import { ICollegeRepository } from '../../domain/repositories/ICollegeRepository';
import { College } from '../../domain/entities/College';
import { BaseRepository, Database } from '@/shared/database';

export class SupabaseCollegeRepository extends BaseRepository<'colleges', College> implements ICollegeRepository {
    constructor(db: SupabaseClient<Database>) {
        super(db, 'colleges');
    }

    private mapToEntity(row: any): College {
        return new College(
            row.id,
            row.name,
            row.code,
            row.address,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<College | null> {
        const row = await super.findById(id);
        return row ? this.mapToEntity(row) : null;
    }

    async findAll(): Promise<College[]> {
        const rows = await super.findAll();
        return rows.map(row => this.mapToEntity(row));
    }

    async findByCode(code: string): Promise<College | null> {
        const { data, error } = await this.db
            .from('colleges')
            .select('*')
            .eq('code', code)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapToEntity(data);
    }

    async create(college: Pick<College, 'name' | 'code' | 'address'>): Promise<College> {
        const row = await this.insertRow({
            name: college.name,
            code: college.code,
            address: college.address
        } as any);

        return this.mapToEntity(row);
    }

    async update(id: string, data: Partial<College>): Promise<College> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.code) updateData.code = data.code;
        if (data.address) updateData.address = data.address;

        const row = await this.updateRow(id, updateData);
        return this.mapToEntity(row);
    }

    async delete(id: string): Promise<boolean> {
        return super.delete(id);
    }

    async codeExists(code: string): Promise<boolean> {
        const college = await this.findByCode(code);
        return college !== null;
    }
}
