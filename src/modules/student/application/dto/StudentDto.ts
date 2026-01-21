import { z } from 'zod';

export const CreateStudentDtoSchema = z.object({
    user_id: z.string().uuid(),
    batch_id: z.string().uuid(),
    roll_number: z.string().min(1),
    enrollment_year: z.number().int().min(2000)
});

export type CreateStudentDto = z.infer<typeof CreateStudentDtoSchema>;

export const CreateBatchDtoSchema = z.object({
    name: z.string().min(1),
    department_id: z.string().uuid(),
    year: z.number().int().min(1).max(4),
    semester: z.number().int().min(1).max(8)
});

export type CreateBatchDto = z.infer<typeof CreateBatchDtoSchema>;
