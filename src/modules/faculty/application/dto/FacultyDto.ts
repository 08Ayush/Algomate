import { z } from 'zod';

export const CreateFacultyDtoSchema = z.object({
    user_id: z.string().uuid('Invalid user ID'),
    department_id: z.string().uuid('Invalid department ID'),
    faculty_type: z.enum(['creator', 'publisher', 'general', 'guest']),
    specialization: z.string().optional(),
    experience: z.number().int().min(0).optional()
});

export type CreateFacultyDto = z.infer<typeof CreateFacultyDtoSchema>;

export const AssignQualificationDtoSchema = z.object({
    faculty_id: z.string().uuid('Invalid faculty ID'),
    subject_id: z.string().uuid('Invalid subject ID'),
    qualification_level: z.string().min(1, 'Qualification level is required'),
    years_of_experience: z.number().int().min(0, 'Experience must be non-negative')
});

export type AssignQualificationDto = z.infer<typeof AssignQualificationDtoSchema>;
