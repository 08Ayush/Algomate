import { z } from 'zod';

export const CreateEventDtoSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    event_date: z.string().datetime(),
    location: z.string().min(1),
    max_participants: z.number().int().positive().optional(),
    department_id: z.string().uuid(),
    created_by: z.string().uuid()
});

export type CreateEventDto = z.infer<typeof CreateEventDtoSchema>;

export const RegisterForEventDtoSchema = z.object({
    event_id: z.string().uuid(),
    user_id: z.string().uuid()
});

export type RegisterForEventDto = z.infer<typeof RegisterForEventDtoSchema>;
