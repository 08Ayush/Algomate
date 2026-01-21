import { z } from 'zod';

export const CreateClassroomDtoSchema = z.object({
    name: z.string().min(1),
    college_id: z.string().uuid(),
    department_id: z.string().uuid().nullable().optional(),
    capacity: z.number().int().min(1),
    type: z.enum(['LECTURE_HALL', 'LAB', 'TUTORIAL', 'AUDITORIUM', 'SEMINAR']).default('LECTURE_HALL'),
    has_projector: z.boolean().default(false),
    has_computers: z.boolean().default(false),
    is_active: z.boolean().default(true)
});

export type CreateClassroomDto = z.infer<typeof CreateClassroomDtoSchema>;
