import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { BroadcastNotificationDto } from '../dto/BroadcastNotificationDto';
export class BroadcastNotificationUseCase {
    constructor(
        private readonly notificationRepository: INotificationRepository,
        private readonly supabase: SupabaseClient // Direct access for recipient resolution to avoid circular deps
    ) { }

    async execute(dto: BroadcastNotificationDto) {
        // Verify sender
        const { data: sender, error: senderError } = await this.supabase
            .from('users')
            .select('id, role, faculty_type')
            .eq('id', dto.sender_id)
            .single();

        if (senderError || !sender) {
            throw new Error('Invalid sender');
        }

        // Only faculty (creator/publisher) can broadcast
        if (sender.role !== 'faculty' || !['creator', 'publisher'].includes(sender.faculty_type)) {
            throw new Error('Only creator and publisher faculty can send notifications');
        }

        const recipientIds = new Set<string>();

        // 1. Resolve Batch
        if (dto.broadcast_to_batch && dto.batch_id) {
            // Students
            const { data: students } = await this.supabase
                .from('student_batch_enrollment')
                .select('student_id')
                .eq('batch_id', dto.batch_id)
                .eq('is_active', true);

            students?.forEach((s: { student_id: string }) => recipientIds.add(s.student_id));

            // Faculty
            const { data: faculty } = await this.supabase
                .from('batch_subjects')
                .select('assigned_faculty_id')
                .eq('batch_id', dto.batch_id);

            faculty?.forEach((f: { assigned_faculty_id: string }) => {
                if (f.assigned_faculty_id) recipientIds.add(f.assigned_faculty_id);
            });
        }

        // 2. Resolve Department
        if (dto.broadcast_to_department && dto.department_id) {
            const { data: deptUsers } = await this.supabase
                .from('users')
                .select('id')
                .eq('department_id', dto.department_id)
                .eq('is_active', true)
                .in('role', ['faculty', 'student']);

            deptUsers?.forEach((u: { id: string }) => recipientIds.add(u.id));
        }

        // 3. Specific Recipients
        if (dto.recipient_ids) {
            dto.recipient_ids.forEach(id => recipientIds.add(id));
        }

        // Remove sender from recipients
        recipientIds.delete(dto.sender_id);

        if (recipientIds.size === 0) {
            // We return success but 0 recipients, effectively no-op
            return { success: true, recipients_count: 0 };
        }

        const notifications = Array.from(recipientIds).map(recipientId => ({
            userId: recipientId,
            title: dto.title,
            message: dto.message,
            type: dto.type,
            isRead: false,
            batchId: dto.batch_id,
            departmentId: dto.department_id,
            timetableId: dto.timetable_id
        }));

        await this.notificationRepository.createMany(notifications);

        return {
            success: true,
            recipients_count: recipientIds.size
        };
    }
}
