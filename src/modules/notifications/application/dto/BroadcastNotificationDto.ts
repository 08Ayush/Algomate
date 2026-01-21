import { z } from 'zod';

export const BroadcastNotificationDtoSchema = z.object({
    sender_id: z.string().uuid(),
    type: z.enum(['timetable_published', 'schedule_change', 'system_alert', 'approval_request']),
    title: z.string().min(1),
    message: z.string().min(1),
    timetable_id: z.string().uuid().optional(),
    batch_id: z.string().uuid().optional(),
    department_id: z.string().uuid().optional(),
    recipient_ids: z.array(z.string().uuid()).optional(),
    broadcast_to_batch: z.boolean().optional(),
    broadcast_to_department: z.boolean().optional(),
});

export type BroadcastNotificationDto = z.infer<typeof BroadcastNotificationDtoSchema>;
