import { z } from 'zod';

export const SaveGeneratedTimetableDtoSchema = z.object({
    title: z.string().optional(),
    semester: z.number(),
    department_id: z.string().uuid().optional(),
    college_id: z.string().uuid().optional(),
    batch_id: z.string().uuid().optional(),
    academic_year: z.string(),
    schedule: z.array(z.any()),
    created_by: z.string().uuid(),
    status: z.enum(['draft', 'pending_approval', 'published']).default('draft').optional()
});

export type SaveGeneratedTimetableDto = z.infer<typeof SaveGeneratedTimetableDtoSchema>;
