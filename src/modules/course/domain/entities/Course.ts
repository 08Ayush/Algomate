export class Course {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly code: string,
        public readonly collegeId: string,
        public readonly departmentId: string | null,
        public readonly duration: number,
        public readonly isActive: boolean,
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
            is_active: this.isActive,
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
            data.duration,
            data.is_active,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
