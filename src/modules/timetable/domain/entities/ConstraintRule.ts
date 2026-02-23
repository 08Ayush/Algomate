export class ConstraintRule {
    constructor(
        public readonly id: string,
        public readonly ruleType: 'HARD' | 'SOFT' | 'PREFERENCE',
        public readonly description: string,
        public readonly weight: number,
        public readonly appliesToDepartments: string[] | null,
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            rule_type: this.ruleType,
            description: this.description,
            weight: this.weight,
            applies_to_departments: this.appliesToDepartments,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}
