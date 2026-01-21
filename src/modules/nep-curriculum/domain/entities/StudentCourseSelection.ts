export class StudentCourseSelection {
    constructor(
        public readonly id: string,
        public readonly studentId: string,
        public readonly subjectId: string,
        public readonly semester: number,
        public readonly academicYear: string,
        public readonly selectionType: 'MAJOR' | 'MINOR' | 'CORE' | 'ELECTIVE',
        public readonly isLocked: boolean,
        public readonly lockedAt: Date | null,
        public readonly createdAt: Date,
        // Optional joined fields for convenience, though strict entities usually avoid this. 
        // We will keep it minimal or use a separate DTO/View model for enriched data.
        // For logic, we mainly need the core fields.
    ) { }

    toJSON() {
        return {
            id: this.id,
            student_id: this.studentId,
            subject_id: this.subjectId,
            semester: this.semester,
            academic_year: this.academicYear,
            selection_type: this.selectionType,
            is_locked: this.isLocked,
            locked_at: this.lockedAt?.toISOString() || null,
            created_at: this.createdAt.toISOString()
        };
    }
}
