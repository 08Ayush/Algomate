import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IElectiveBucketRepository } from '../../domain/repositories/IElectiveBucketRepository';
import { ElectiveBucket } from '../../domain/entities/ElectiveBucket';

export class SupabaseElectiveBucketRepository implements IElectiveBucketRepository {
    constructor(private readonly db: SupabaseClient) { }

    async findById(id: string): Promise<ElectiveBucket | null> {
        const { data, error } = await this.db
            .from('elective_buckets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return ElectiveBucket.fromDatabase(data);
    }

    async findByBatchId(batchId: string): Promise<ElectiveBucket[]> {
        const { data, error } = await this.db
            .from('elective_buckets')
            .select('*')
            .eq('batch_id', batchId);

        if (error) throw error;
        return (data || []).map(row => ElectiveBucket.fromDatabase(row));
    }

    async findByCollegeId(collegeId: string): Promise<ElectiveBucket[]> {
        const { data, error } = await this.db
            .from('elective_buckets')
            .select(`
                *,
                batches!inner(college_id)
            `)
            .eq('batches.college_id', collegeId);

        if (error) throw error;
        return (data || []).map(row => ElectiveBucket.fromDatabase(row));
    }

    async create(bucket: Omit<ElectiveBucket, 'id' | 'createdAt' | 'updatedAt'>): Promise<ElectiveBucket> {
        const { data, error } = await this.db
            .from('elective_buckets')
            .insert({
                batch_id: bucket.batchId,
                bucket_name: bucket.bucketName,
                bucket_type: bucket.bucketType,
                min_selection: bucket.minSelection,
                max_selection: bucket.maxSelection,
                is_common_slot: bucket.isCommonSlot
            } as any)
            .select()
            .single();

        if (error) throw error;
        return ElectiveBucket.fromDatabase(data);
    }

    async update(id: string, data: Partial<ElectiveBucket>): Promise<ElectiveBucket> {
        const updateData: any = {};
        if (data.bucketName) updateData.bucket_name = data.bucketName;
        if (data.bucketType) updateData.bucket_type = data.bucketType;
        if (data.minSelection !== undefined) updateData.min_selection = data.minSelection;
        if (data.maxSelection !== undefined) updateData.max_selection = data.maxSelection;
        if (data.isCommonSlot !== undefined) updateData.is_common_slot = data.isCommonSlot;

        const { data: result, error } = await this.db
            .from('elective_buckets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return ElectiveBucket.fromDatabase(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('elective_buckets')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async deleteByBatchId(batchId: string): Promise<boolean> {
        const { error } = await this.db
            .from('elective_buckets')
            .delete()
            .eq('batch_id', batchId);

        if (error) throw error;
        return true;
    }

    async linkSubjects(bucketId: string, subjectIds: string[]): Promise<void> {
        if (subjectIds.length === 0) return;

        const { error } = await this.db
            .from('subjects')
            .update({ course_group_id: bucketId } as any)
            .in('id', subjectIds);

        if (error) throw error;
    }

    async unlinkSubjects(subjectIds: string[]): Promise<void> {
        if (subjectIds.length === 0) return;

        const { error } = await this.db
            .from('subjects')
            .update({ course_group_id: null } as any)
            .in('id', subjectIds);

        if (error) throw error;
    }
}
