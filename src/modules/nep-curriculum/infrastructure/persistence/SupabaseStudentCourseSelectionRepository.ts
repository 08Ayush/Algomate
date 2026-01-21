import { SupabaseClient } from '@supabase/supabase-js';
import { IStudentCourseSelectionRepository } from '../../domain/repositories/IStudentCourseSelectionRepository';
import { StudentCourseSelection } from '../../domain/entities/StudentCourseSelection';
import { Database } from '@/shared/database';

export class SupabaseStudentCourseSelectionRepository implements IStudentCourseSelectionRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): StudentCourseSelection {
        return new StudentCourseSelection(
            row.id,
            row.student_id,
            row.subject_id,
            row.semester,
            row.academic_year,
            row.selection_type,
            row.is_locked,
            row.locked_at ? new Date(row.locked_at) : null,
            new Date(row.created_at)
        );
    }

    async findByStudent(studentId: string, semester?: number, academicYear?: string): Promise<StudentCourseSelection[]> {
        let query = this.db
            .from('student_course_selections' as any)
            .select('*')
            .eq('student_id', studentId);

        if (semester) query = query.eq('semester', semester);
        if (academicYear) query = query.eq('academic_year', academicYear);

        const { data, error } = await query.order('id', { ascending: false });

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findExistingSelection(studentId: string, subjectId: string, semester: number, academicYear: string): Promise<StudentCourseSelection | null> {
        const { data, error } = await this.db
            .from('student_course_selections' as any)
            .select('*')
            .eq('student_id', studentId)
            .eq('subject_id', subjectId)
            .eq('semester', semester)
            .eq('academic_year', academicYear)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findMajors(studentId: string): Promise<StudentCourseSelection[]> {
        // This is needed for the Major Locking logic check
        // We might need to join subjects to get domain info, but repo should ideally return entity.
        // Logic service or Use Case will handle the domain check by fetching Subject details separately or using an enriched query?
        // For now, let's just return the selections. Use Case can verify domains.
        // Or we can add a method `findMajorsWithSubjects`?
        // Let's stick to entity return for now.

        const { data, error } = await this.db
            .from('student_course_selections' as any)
            .select('*')
            .eq('student_id', studentId)
            .eq('selection_type', 'MAJOR');

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(selection: Omit<StudentCourseSelection, 'id' | 'createdAt' | 'isLocked' | 'lockedAt'>): Promise<StudentCourseSelection> {
        const { data, error } = await (this.db
            .from('student_course_selections' as any) as any)
            .insert({
                student_id: selection.studentId,
                subject_id: selection.subjectId,
                semester: selection.semester,
                academic_year: selection.academicYear,
                selection_type: selection.selectionType
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async delete(studentId: string, subjectId: string): Promise<boolean> {
        const { error } = await this.db
            .from('student_course_selections' as any)
            .delete()
            .eq('student_id', studentId)
            .eq('subject_id', subjectId);

        if (error) throw error;
        return true;
    }

    async findById(id: string): Promise<StudentCourseSelection | null> {
        const { data, error } = await this.db
            .from('student_course_selections' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }
}
