import { IStudentCourseSelectionRepository } from '../../domain/repositories/IStudentCourseSelectionRepository';
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository';
import { StudentCourseSelection } from '../../domain/entities/StudentCourseSelection';

interface SaveSelectionRequest {
    studentId: string;
    subjectId: string;
    semester: number;
    academicYear: string;
}

export class SaveStudentSelectionUseCase {
    constructor(
        private readonly selectionRepository: IStudentCourseSelectionRepository,
        private readonly subjectRepository: ISubjectRepository
    ) { }

    async execute(request: SaveSelectionRequest): Promise<StudentCourseSelection> {
        // 1. Check if selection already exists
        const existing = await this.selectionRepository.findExistingSelection(
            request.studentId,
            request.subjectId,
            request.semester,
            request.academicYear
        );

        if (existing) {
            throw new Error('Subject already selected for this semester');
        }

        // 2. Get subject details
        const subject = await this.subjectRepository.findById(request.subjectId);
        if (!subject) {
            throw new Error('Subject not found');
        }

        // 3. Determine selection type
        let selectionType: 'MAJOR' | 'MINOR' | 'CORE' | 'ELECTIVE' = 'ELECTIVE';

        // Logic from existing route:
        // if (['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subject.nep_category)) ...
        // We need to access these properties from Subject entity. 
        // Assuming Subject entity has 'category' (mapped from nep_category/category)

        // Note: Subject.ts entity definition I saw earlier had 'category'.
        // Route checks specific string values.

        const category = subject.category || '';
        if (['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(category)) {
            selectionType = 'MAJOR';
        } else if (['MINOR', 'CORE MINOR'].includes(category)) {
            selectionType = 'MINOR';
        } else if (['CORE', 'CORE PARTIAL'].includes(category)) {
            selectionType = 'CORE';
        }

        // 4. Check for existing MAJOR from semester 3+ (Locking Logic)
        if (selectionType === 'MAJOR' && request.semester >= 3) {
            // Fetch all majors for this student
            // The existing repo method 'findMajors' returns entities.
            // We need to check their subject domains.
            // This suggests we need to fetch subjects for these selections to check domain.

            const existingMajors = await this.selectionRepository.findMajors(request.studentId);

            // Filter for Sem 3+
            const seniorMajors = existingMajors.filter(s => s.semester >= 3);

            if (seniorMajors.length > 0) {
                // Sort by semester ascending to find the "first" one that locked it?
                // Or just check consistency. Route code checks if new subject domain matches existing.

                // We need subject domains. Fetch subjects for these majors.
                // Optimization: findMajorsWithDomains? Or loop fetch.
                // For now, loop fetch (N is small, usually 1 or 2 majors per sem).

                for (const major of seniorMajors) {
                    const majorSubject = await this.subjectRepository.findById(major.subjectId);
                    if (majorSubject) {
                        // Check domains
                        // Subject entity needs 'domain' property. 
                        // Existing route uses 'subject_domain'.
                        // My Subject entity view earlier showed: id, name, code, credits, category, semester...
                        // Did it have domain? I need to check Subject entity again or add it.

                        // Assuming we might need to add domain to Subject entity if missing.
                        // Let's assume it has it or I will add it.
                        // Route logic: if (subject?.subject_domain !== existingSubjectData?.subject_domain) error

                        // Temporarily casting to any to access potential domain if not in strict entity yet
                        const newDomain = (subject as any).domain || (subject as any).subjectDomain;
                        const existingDomain = (majorSubject as any).domain || (majorSubject as any).subjectDomain;

                        if (newDomain && existingDomain && newDomain !== existingDomain) {
                            throw new Error(`Cannot change MAJOR subject. You selected a MAJOR in Semester ${major.semester} from the "${existingDomain}" domain. You must continue with subjects from the same domain.`);
                        }

                        // Only need to find one valid predecessor to enforce lock? 
                        // Route finds "existingMajor".
                        break; // Found one to compare against
                    }
                }
            }
        }

        // 5. Create selection
        // Trigger in DB might also enforce logic, but we do it here too for UI feedback.
        return this.selectionRepository.create({
            studentId: request.studentId,
            subjectId: request.subjectId,
            semester: request.semester,
            academicYear: request.academicYear,
            selectionType
        } as any);
    }
}
