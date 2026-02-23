import { z } from 'zod';

export const CreateSubjectDtoSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    credits: z.number().int().min(1).max(6),
    category: z.enum(['MAJOR', 'MINOR', 'OPEN_ELECTIVE', 'CORE']),
    semester: z.number().int().min(1).max(8),
    department_id: z.string().uuid()
});

export type CreateSubjectDto = z.infer<typeof CreateSubjectDtoSchema>;
