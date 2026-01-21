/**
 * Subject Entity (NEP 2020)
 */
export class Subject {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string,
        public readonly credits: number,
        public readonly category: 'MAJOR' | 'MINOR' | 'OPEN_ELECTIVE' | 'CORE',
        public readonly semester: number,
        public readonly departmentId: string,
        public readonly domain: string | null, // Added for Major locking logic
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            code: this.code,
            credits: this.credits,
            category: this.category,
            semester: this.semester,
            department_id: this.departmentId,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Elective Bucket Entity
 */
export class ElectiveBucket {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly departmentId: string,
        public readonly semester: number,
        public readonly maxSelections: number,
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            department_id: this.departmentId,
            semester: this.semester,
            max_selections: this.maxSelections,
            created_at: this.createdAt.toISOString()
        };
    }
}
