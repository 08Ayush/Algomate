import { z } from 'zod';

export const SendNotificationDtoSchema = z.object({
    user_id: z.string().uuid(),
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.enum(['info', 'warning', 'success', 'error']).default('info')
});

export type SendNotificationDto = z.infer<typeof SendNotificationDtoSchema>;

export const MarkAsReadDtoSchema = z.object({
    notification_id: z.string().uuid()
});

export type MarkAsReadDto = z.infer<typeof MarkAsReadDtoSchema>;
