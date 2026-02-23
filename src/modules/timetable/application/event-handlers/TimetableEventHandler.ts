import { eventBus, DomainEvent } from '@/shared/events/EventBus';

/**
 * Event handler for Timetable-related events
 * Reacts to events from TimetableModule
 */
export class TimetableEventHandler {
    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        // Listen to timetable approval
        eventBus.subscribe('timetable.approved', this.handleTimetableApproved.bind(this));

        // Listen to timetable rejection
        eventBus.subscribe('timetable.rejected', this.handleTimetableRejected.bind(this));

        // Listen to timetable submission
        eventBus.subscribe('timetable.submitted', this.handleTimetableSubmitted.bind(this));
    }

    private async handleTimetableApproved(event: DomainEvent): Promise<void> {
        console.log('🎉 Timetable approved event received', event.payload);

        // Example: Send notification to creator
        // await notificationService.send({
        //   userId: event.payload.createdBy,
        //   message: 'Your timetable has been approved!',
        //   type: 'success'
        // });

        // Example: Update dashboard statistics
        // await dashboardService.updateStats();
    }

    private async handleTimetableRejected(event: DomainEvent): Promise<void> {
        console.log('❌ Timetable rejected event received', event.payload);

        // Example: Send notification to creator with reason
        // await notificationService.send({
        //   userId: event.payload.createdBy,
        //   message: `Timetable rejected: ${event.payload.reason}`,
        //   type: 'error'
        // });
    }

    private async handleTimetableSubmitted(event: DomainEvent): Promise<void> {
        console.log('📨 Timetable submitted event received', event.payload);

        // Example: Notify reviewers
        // await notificationService.notifyReviewers(event.payload.departmentId);
    }
}

// Initialize handler
export const timetableEventHandler = new TimetableEventHandler();
