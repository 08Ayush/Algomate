export class Classroom {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly collegeId: string,
        public readonly departmentId: string | null,
        public readonly departmentName: string | null,
        public readonly departmentCode: string | null,
        public readonly capacity: number,
        public readonly type: string,
        public readonly hasProjector: boolean,
        public readonly hasComputers: boolean,
        public readonly hasAc: boolean,
        public readonly isAvailable: boolean,
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
            department_name: this.departmentName,
            department_code: this.departmentCode,
            capacity: this.capacity,
            type: this.type,
            has_projector: this.hasProjector,
            has_computers: this.hasComputers,
            has_ac: this.hasAc,
            is_available: this.isAvailable,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    static fromDatabase(data: any): Classroom {
        // Supabase join returns related data as a nested object
        const dept = data.departments || null;
        return new Classroom(
            data.id,
            data.name,
            data.college_id,
            data.department_id,
            dept ? dept.name : null,
            dept ? dept.code : null,
            data.capacity,
            data.type || 'Lecture Hall',
            data.has_projector || false,
            data.has_computers || false,
            data.has_ac || false,
            data.is_available !== undefined ? data.is_available : true,
            data.is_active !== undefined ? data.is_active : true,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
