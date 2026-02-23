export class Course {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly code: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            code: this.code,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
