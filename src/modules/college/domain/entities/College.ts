/**
 * College Entity
 * 
 * Represents a college in the domain model
 */
export class College {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string,
        public readonly address: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            code: this.code,
            address: this.address,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
