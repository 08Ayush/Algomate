import { z } from 'zod';

export const CreateClassroomDtoSchema = z.object({
    name: z.string().min(1),
    college_id: z.string().uuid(),
    department_id: z.string().uuid().nullable().optional(),
    capacity: z.number().int().min(1),
    type: z.string().default('Lecture Hall'), // Changed to string to match frontend loose typing or update enum
    has_projector: z.boolean().default(false),
    has_computers: z.boolean().default(false),
    has_ac: z.boolean().default(false),
    is_available: z.boolean().default(true)
    // is_active removed to match DB
});

export type CreateClassroomDto = z.infer<typeof CreateClassroomDtoSchema>;
