/**
 * Faculty Entity
 */
export class Faculty {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly departmentId: string,
        public readonly facultyType: string,
        public readonly specialization: string | null,
        public readonly experience: number | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            department_id: this.departmentId,
            faculty_type: this.facultyType,
            specialization: this.specialization,
            experience: this.experience,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Faculty Qualification Entity
 */
export class FacultyQualification {
    constructor(
        public readonly id: string,
        public readonly facultyId: string,
        public readonly subjectId: string,
        public readonly qualificationLevel: string,
        public readonly yearsOfExperience: number,
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            faculty_id: this.facultyId,
            subject_id: this.subjectId,
            qualification_level: this.qualificationLevel,
            years_of_experience: this.yearsOfExperience,
            created_at: this.createdAt.toISOString()
        };
    }
}
