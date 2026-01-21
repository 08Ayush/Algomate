export class Batch {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly collegeId: string,
        public readonly departmentId: string,
        public readonly courseId: string | null,
        public readonly semester: number,
        public readonly section: string | null,
        public readonly academicYear: string,
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            college_id: this.collegeId,
            department_id: this.departmentId,
            course_id: this.courseId,
            semester: this.semester,
            section: this.section,
            academic_year: this.academicYear,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    static fromDatabase(data: any): Batch {
        return new Batch(
            data.id,
            data.name,
            data.college_id,
            data.department_id,
            data.course_id,
            data.semester,
            data.section,
            data.academic_year,
            data.is_active,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
