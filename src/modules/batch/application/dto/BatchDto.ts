import { z } from 'zod';

export const CreateBatchDtoSchema = z.object({
    name: z.string().min(1),
    college_id: z.string().uuid(),
    department_id: z.string().uuid(),
    course_id: z.string().uuid().nullable().optional(),
    semester: z.number().int().min(1).max(12),
    section: z.string().nullable().optional(),
    academic_year: z.string(),
    is_active: z.boolean().default(true)
});

export type CreateBatchDto = z.infer<typeof CreateBatchDtoSchema>;
