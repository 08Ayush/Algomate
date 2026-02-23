export class Department {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string,
        public readonly description: string | null,
        public readonly collegeId: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            code: this.code,
            description: this.description,
            college_id: this.collegeId,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
