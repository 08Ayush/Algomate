/**
 * Timetable Entity
 */
export class Timetable {
    constructor(
        public readonly id: string,
        public readonly departmentId: string,
        public readonly batchId: string,
        public readonly collegeId: string,
        public readonly semester: number,
        public readonly academicYear: string,
        public readonly fitnessScore: number,
        public readonly constraintViolations: any[],
        public readonly generationMethod: string,
        public readonly status: 'draft' | 'published' | 'archived',
        public readonly createdBy: string,
        public readonly publishedAt: Date | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            department_id: this.departmentId,
            batch_id: this.batchId,
            college_id: this.collegeId,
            semester: this.semester,
            academic_year: this.academicYear,
            fitness_score: this.fitnessScore,
            constraint_violations: this.constraintViolations,
            generation_method: this.generationMethod,
            status: this.status,
            created_by: this.createdBy,
            published_at: this.publishedAt?.toISOString() || null,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Scheduled Class Entity
 */
export class ScheduledClass {
    constructor(
        public readonly id: string,
        public readonly timetableId: string,
        public readonly subjectId: string,
        public readonly facultyId: string,
        public readonly classroomId: string,
        public readonly dayOfWeek: number,
        public readonly startTime: string,
        public readonly endTime: string,
        public readonly isLab: boolean,
        public readonly sessionDuration: number,
        public readonly classType: string,
        public readonly creditHourNumber: number,
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            timetable_id: this.timetableId,
            subject_id: this.subjectId,
            faculty_id: this.facultyId,
            classroom_id: this.classroomId,
            day_of_week: this.dayOfWeek,
            start_time: this.startTime,
            end_time: this.endTime,
            is_lab: this.isLab,
            session_duration: this.sessionDuration,
            class_type: this.classType,
            credit_hour_number: this.creditHourNumber,
            created_at: this.createdAt.toISOString()
        };
    }
}
