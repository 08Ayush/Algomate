import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IConstraintRepository } from '../../domain/repositories/IConstraintRepository';
import { ConstraintRule } from '../../domain/entities/ConstraintRule';
import { Database } from '@/shared/database';

export class SupabaseConstraintRepository implements IConstraintRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): ConstraintRule {
        return new ConstraintRule(
            row.id,
            row.rule_type,
            row.description,
            row.weight,
            row.applies_to_departments,
            row.is_active,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findAll(): Promise<ConstraintRule[]> {
        const { data, error } = await this.db
            .from('constraint_rules' as any)
            .select('*')
            .order('rule_type', { ascending: true })
            .order('weight', { ascending: false });

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByDepartment(departmentId: string): Promise<ConstraintRule[]> {
        // Fetch all and filter in memory because 'applies_to_departments' is likely an array column (JSONB or text[])
        // Supabase/Postgrest 'cs' (contains) filter or 'ov' (overlap) could work if it's an array type.
        // The legacy code fetched all and filtered. We'll stick to that for safety unless we know the column type for sure.
        // Actually, legacy code: !rule.applies_to_departments || length===0 || includes(departmentId)

        const { data, error } = await this.db
            .from('constraint_rules' as any)
            .select('*')
            .order('rule_type', { ascending: true })
            .order('weight', { ascending: false });

        if (error) throw error;

        const allRules = data.map(row => this.mapToEntity(row));

        return allRules.filter(rule =>
            !rule.appliesToDepartments ||
            rule.appliesToDepartments.length === 0 ||
            rule.appliesToDepartments.includes(departmentId)
        );
    }
}
