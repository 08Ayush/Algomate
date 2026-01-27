export class Course {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly code: string,
        public readonly collegeId: string,
        public readonly departmentId: string | null,
        public readonly duration: number,
        public readonly isActive: boolean,
        public readonly intake: number,
        public readonly natureOfCourse: string | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            code: this.code,
            college_id: this.collegeId,
            department_id: this.departmentId,
            duration: this.duration,
            duration_years: this.duration, // For frontend compatibility
            is_active: this.isActive,
            intake: this.intake,
            nature_of_course: this.natureOfCourse,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    static fromDatabase(data: any): Course {
        return new Course(
            data.id,
            data.title,
            data.code,
            data.college_id,
            data.department_id,
            data.duration_years || data.duration || 0,
            data.is_active !== undefined ? data.is_active : true, // Default to true if missing
            data.intake || 0,
            data.nature_of_course || null,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
