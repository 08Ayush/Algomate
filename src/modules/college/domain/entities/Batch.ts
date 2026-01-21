export class Batch {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly departmentId: string,
        public readonly collegeId: string,
        public readonly semester: number,
        public readonly academicYear: string,
        public readonly section: string | null,
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            department_id: this.departmentId,
            college_id: this.collegeId,
            semester: this.semester,
            academic_year: this.academicYear,
            section: this.section,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
