import EventEmitter from 'eventemitter3';

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload?: any;
}

/**
 * Event Bus for inter-module communication
 * Implements pub/sub pattern for loose coupling between modules
 */
export class EventBus {
    private emitter: EventEmitter;
    private static instance: EventBus;

    private constructor() {
        this.emitter = new EventEmitter();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Publish an event
     */
    publish(event: DomainEvent): void {
        console.log(`📢 Event published: ${event.eventType}`, event);
        this.emitter.emit(event.eventType, event);

        // Also emit on wildcard for global listeners
        this.emitter.emit('*', event);
    }

    /**
     * Subscribe to an event
     */
    subscribe(eventType: string, handler: (event: DomainEvent) => void | Promise<void>): void {
        this.emitter.on(eventType, handler);
        console.log(`👂 Subscribed to: ${eventType}`);
    }

    /**
     * Subscribe to all events
     */
    subscribeAll(handler: (event: DomainEvent) => void | Promise<void>): void {
        this.emitter.on('*', handler);
        console.log('👂 Subscribed to all events');
    }

    /**
     * Unsubscribe from an event
     */
    unsubscribe(eventType: string, handler: (event: DomainEvent) => void | Promise<void>): void {
        this.emitter.off(eventType, handler);
    }

    /**
     * Clear all listeners for an event
     */
    clearListeners(eventType: string): void {
        this.emitter.removeAllListeners(eventType);
    }

    /**
     * Clear all listeners
     */
    clearAll(): void {
        this.emitter.removeAllListeners();
    }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
