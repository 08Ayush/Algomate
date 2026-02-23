export class ElectiveBucket {
    constructor(
        public readonly id: string,
        public readonly batchId: string,
        public readonly bucketName: string,
        public readonly bucketType: 'GENERAL' | 'SKILL' | 'MINOR' | 'HONORS',
        public readonly minSelection: number,
        public readonly maxSelection: number,
        public readonly isCommonSlot: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            batch_id: this.batchId,
            bucket_name: this.bucketName,
            bucket_type: this.bucketType,
            min_selection: this.minSelection,
            max_selection: this.maxSelection,
            is_common_slot: this.isCommonSlot,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    static fromDatabase(data: any): ElectiveBucket {
        return new ElectiveBucket(
            data.id,
            data.batch_id,
            data.bucket_name,
            data.bucket_type || 'GENERAL',
            data.min_selection,
            data.max_selection,
            data.is_common_slot,
            new Date(data.created_at),
            new Date(data.updated_at)
        );
    }
}
