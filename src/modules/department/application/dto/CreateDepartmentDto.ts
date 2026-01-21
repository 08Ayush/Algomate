import { z } from 'zod';

export const CreateDepartmentDtoSchema = z.object({
    name: z.string().min(1, 'Department name is required'),
    code: z.string().min(2, 'Department code must be at least 2 characters'),
    description: z.string().optional(),
    college_id: z.string().uuid('Invalid college ID')
});

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentDtoSchema>;
