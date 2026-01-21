export class Classroom {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly collegeId: string,
        public readonly departmentId: string | null,
        public readonly capacity: number,
        public readonly type: 'LECTURE_HALL' | 'LAB' | 'TUTORIAL' | 'AUDITORIUM' | 'SEMINAR',
        public readonly hasProjector: boolean,
        public readonly hasComputers: boolean,
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
            capacity: this.capacity,
            type: this.type,
            has_projector: this.hasProjector,
            has_computers: this.hasComputers,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    static fromDatabase(data: any): Classroom {
        return new Classroom(
            data.id,
            data.name,
            data.college_id,
            data.department_id,
            data.capacity,
            data.type || 'LECTURE_HALL',
            data.has_projector || false,
            data.has_computers || false,
            data.is_active,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
