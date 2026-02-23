import { z } from 'zod';

export const GenerateTimetableDtoSchema = z.object({
    department_id: z.string().uuid(),
    batch_id: z.string().uuid(),
    semester: z.number().int().min(1).max(8),
    academic_year: z.string(),
    created_by: z.string().uuid()
});

export type GenerateTimetableDto = z.infer<typeof GenerateTimetableDtoSchema>;

export const PublishTimetableDtoSchema = z.object({
    timetable_id: z.string().uuid()
});

export type PublishTimetableDto = z.infer<typeof PublishTimetableDtoSchema>;
