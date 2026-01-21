/**
 * Student Entity
 */
export class Student {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly batchId: string,
        public readonly rollNumber: string,
        public readonly enrollmentYear: number,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            batch_id: this.batchId,
            roll_number: this.rollNumber,
            enrollment_year: this.enrollmentYear,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Batch Entity
 */
export class Batch {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly departmentId: string,
        public readonly year: number,
        public readonly semester: number,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            department_id: this.departmentId,
            year: this.year,
            semester: this.semester,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
