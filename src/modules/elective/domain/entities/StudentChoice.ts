export class StudentChoice {
    constructor(
        public readonly id: string,
        public readonly studentId: string,
        public readonly bucketId: string,
        public readonly subjectId: string,
        public readonly priority: number,
        public readonly status: 'pending' | 'allocated' | 'rejected',
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            student_id: this.studentId,
            bucket_id: this.bucketId,
            subject_id: this.subjectId,
            priority: this.priority,
            status: this.status,
            created_at: this.createdAt.toISOString()
        };
    }

    static fromDatabase(data: any): StudentChoice {
        return new StudentChoice(
            data.id,
            data.student_id,
            data.bucket_id,
            data.subject_id,
            data.priority,
            data.status || 'pending',
            new Date(data.created_at)
        );
    }
}
