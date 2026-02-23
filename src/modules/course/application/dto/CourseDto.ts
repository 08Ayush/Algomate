import { z } from 'zod';

export const CreateCourseDtoSchema = z.object({
    title: z.string().min(1),
    code: z.string().min(1),
    college_id: z.string().uuid(),
    department_id: z.string().uuid().nullable().optional(),
    duration: z.number().int().min(1),
    intake: z.number().int().min(1).default(60),
    nature_of_course: z.string().optional().nullable(),
    is_active: z.boolean().default(true)
});

export type CreateCourseDto = z.infer<typeof CreateCourseDtoSchema>;
