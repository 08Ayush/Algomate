import { z } from 'zod';

export const CreateElectiveBucketDtoSchema = z.object({
    batch_id: z.string().uuid(),
    bucket_name: z.string().min(1),
    bucket_type: z.enum(['GENERAL', 'SKILL', 'MINOR', 'HONORS']).default('GENERAL'),
    min_selection: z.number().int().min(1).default(1),
    max_selection: z.number().int().min(1).default(1),
    is_common_slot: z.boolean().default(true),
    subject_ids: z.array(z.string().uuid()).optional()
});

export const UpdateElectiveBucketDtoSchema = z.object({
    bucket_name: z.string().min(1).optional(),
    bucket_type: z.enum(['GENERAL', 'SKILL', 'MINOR', 'HONORS']).optional(),
    min_selection: z.number().int().min(1).optional(),
    max_selection: z.number().int().min(1).optional(),
    is_common_slot: z.boolean().optional()
});

export type CreateElectiveBucketDto = z.infer<typeof CreateElectiveBucketDtoSchema>;
export type UpdateElectiveBucketDto = z.infer<typeof UpdateElectiveBucketDtoSchema>;
