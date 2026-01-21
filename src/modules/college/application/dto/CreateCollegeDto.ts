import { z } from 'zod';

export const CreateCollegeDtoSchema = z.object({
    name: z.string().min(1, 'College name is required'),
    code: z.string().min(2, 'College code must be at least 2 characters'),
    address: z.string().min(1, 'Address is required')
});

export type CreateCollegeDto = z.infer<typeof CreateCollegeDtoSchema>;
