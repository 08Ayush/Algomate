import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
export class GetReviewQueueUseCase {
    constructor(private readonly supabase: SupabaseClient) { }

    async execute(departmentId: string, userRole: string) {
        // Authorization: Only publishers can view review queue
        if (userRole !== 'publisher') {
            throw new Error('Only publishers can access the review queue.');
        }

        // Fetch pending timetables for the department
        const { data, error } = await this.supabase
            .from('generated_timetables')
            .select(`
                id,
                title,
                batch_id,
                semester,
                academic_year,
                status,
                fitness_score,
                created_at,
                created_by,
                batches!inner(id, name, department_id),
                creator:users!generated_timetables_created_by_fkey(first_name, last_name, email)
            `)
            .eq('batches.department_id', departmentId)
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            batch_id: t.batch_id,
            batch_name: t.batches?.name || 'Unknown',
            semester: t.semester,
            academic_year: t.academic_year,
            status: t.status,
            fitness_score: t.fitness_score,
            created_at: t.created_at,
            creator: t.creator
        }));

        return {
            success: true,
            timetables: formatted,
            count: formatted.length
        };
    }
}
