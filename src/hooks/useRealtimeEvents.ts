// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

/**
 * useRealtimeEvents Hook
 * 
 * ⚠️ IMPORTANT: Uses POLLING instead of Realtime (Neon PostgreSQL limitation)
 * 
 * Monitors calendar events using a polling mechanism to detect new, updated,
 * or deleted events in the college/department.
 * 
 * HOW IT WORKS:
 * 1. Fetches initial events on mount
 * 2. Polls for changes every 45 seconds
 * 3. Detects new, updated, and deleted events by comparing timestamps
 * 4. Triggers callbacks when changes are detected
 * 5. Shows browser notifications for new events (if permission granted)
 * 
 * PERFORMANCE:
 * - Polling interval: 45 seconds
 * - Max events per fetch: 100
 * - Tracks last update timestamp to detect changes
 * 
 * USAGE:
 * ```typescript
 * const { events, loading, refetch } = useRealtimeEvents({
 *   collegeId: 'college-123',
 *   onEventCreated: (event) => toast.success(`New event: ${event.title}`),
 *   onEventUpdated: (event) => toast.info(`Event updated: ${event.title}`),
 *   onEventDeleted: (id) => toast.warning('Event deleted')
 * });
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  event_type: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  venue?: string;
  max_participants?: number;
  current_participants?: number;
  is_recurring: boolean;
  college_id: string;
  department_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

interface UseRealtimeEventsOptions {
  collegeId: string;
  departmentId?: string;
  eventType?: string;
  status?: string;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabaseBrowser
        .from('events')
        .select('*, users!created_by(first_name, last_name)', { count: 'exact' })
        .eq('college_id', options.collegeId)
        .order('start_date', { ascending: true })
        .limit(100);

      // Apply filters
      if (options.departmentId) {
        query = query.eq('department_id', options.departmentId);
      }
      if (options.eventType) {
        query = query.eq('event_type', options.eventType);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Map data to our interface
      const mappedData: CalendarEvent[] = (data || []).map((item: any) => ({
        ...item,
        creator_name: item.users 
          ? `${item.users.first_name} ${item.users.last_name}` 
          : 'Unknown',
      }));

      setEvents(mappedData);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.collegeId, options.departmentId, options.eventType, options.status]);

  // Enrich event with creator name (kept for backward compatibility, not used in polling)
  const enrichEvent = useCallback(async (event: any): Promise<CalendarEvent> => {
    try {
      const { data: userData } = (await supabaseBrowser
        .from('users')
        .select('first_name, last_name')
        .eq('id', event.created_by)
        .single()) as { data: { first_name: string; last_name: string } | null; error: any };

      return {
        ...event,
        creator_name: userData
          ? `${userData.first_name} ${userData.last_name}`
          : 'Unknown',
      };
    } catch {
      return {
        ...event,
        creator_name: 'Unknown',
      };
    }
  }, []);

  // Setup polling-based event monitoring (Neon doesn't support Realtime)
  useEffect(() => {
    console.log('🔄 Starting polling-based event monitoring (checking every 45 seconds)');
    
    // Initial fetch
    fetchEvents();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Track last known state for change detection
    let lastEventIds = new Set<string>();
    let lastEventUpdates = new Map<string, string>(); // id -> updated_at

    const pollForChanges = async () => {
      try {
        let query = supabaseBrowser
          .from('events')
          .select('*, users!created_by(first_name, last_name)', { count: 'exact' })
          .eq('college_id', options.collegeId)
          .order('updated_at', { ascending: false })
          .limit(100);

        // Apply filters
        if (options.departmentId) {
          query = query.eq('department_id', options.departmentId);
        }
        if (options.eventType) {
          query = query.eq('event_type', options.eventType);
        }
        if (options.status) {
          query = query.eq('status', options.status);
        }

        const { data, count } = await query;

        if (!data) return;

        // Map data with creator names
        const mappedData: CalendarEvent[] = data.map((item: any) => ({
          ...item,
          creator_name: item.users 
            ? `${item.users.first_name} ${item.users.last_name}` 
            : 'Unknown',
        }));

        const currentEventIds = new Set(mappedData.map((e: CalendarEvent) => e.id));
        const currentEventUpdates = new Map(mappedData.map((e: CalendarEvent) => [e.id, e.updated_at]));

        // First poll - just initialize
        if (lastEventIds.size === 0) {
          lastEventIds = currentEventIds;
          lastEventUpdates = currentEventUpdates;
          setEvents(mappedData);
          setTotalCount(count || 0);
          return;
        }

        // Detect NEW events
        const newEventIds = [...currentEventIds].filter(id => !lastEventIds.has(id));
        if (newEventIds.length > 0) {
          const newEvents = mappedData.filter((e: CalendarEvent) => newEventIds.includes(e.id));
          console.log(`📅 ${newEvents.length} new event(s) detected`);
          
          newEvents.forEach((event: CalendarEvent) => {
            // Trigger callback
            if (options.onEventCreated) {
              options.onEventCreated(event);
            }

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Event Created', {
                body: `${event.title} - ${new Date(event.start_date).toLocaleDateString()}`,
                icon: '/favicon.ico',
              });
            }
          });
        }

        // Detect UPDATED events
        const updatedEvents = mappedData.filter((e: CalendarEvent) => {
          const oldTimestamp = lastEventUpdates.get(e.id);
          const newTimestamp = currentEventUpdates.get(e.id);
          return oldTimestamp && newTimestamp && oldTimestamp !== newTimestamp;
        });
        
        if (updatedEvents.length > 0) {
          console.log(`📝 ${updatedEvents.length} event(s) updated`);
          updatedEvents.forEach((event: CalendarEvent) => {
            if (options.onEventUpdated) {
              options.onEventUpdated(event);
            }
          });
        }

        // Detect DELETED events
        const deletedEventIds = [...lastEventIds].filter(id => !currentEventIds.has(id));
        if (deletedEventIds.length > 0) {
          console.log(`🗑️ ${deletedEventIds.length} event(s) deleted`);
          deletedEventIds.forEach((id: string) => {
            if (options.onEventDeleted) {
              options.onEventDeleted(id);
            }
          });
        }

        // Update state
        setEvents(mappedData);
        setTotalCount(count || 0);
        lastEventIds = currentEventIds;
        lastEventUpdates = currentEventUpdates;

      } catch (err) {
        console.error('❌ Error polling events:', err);
      }
    };

    // Poll every 45 seconds
    const pollInterval = setInterval(pollForChanges, 45000);

    // Create cleanup channel
    const cleanupChannel: RealtimeChannel = {
      unsubscribe: () => {
        console.log('🔌 Stopping event polling');
        clearInterval(pollInterval);
      }
    };

    setChannel(cleanupChannel);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up events hook');
      clearInterval(pollInterval);
    };
  }, [fetchEvents, options.collegeId, options.departmentId, options.eventType, options.status, options.onEventCreated, options.onEventUpdated, options.onEventDeleted]);

  return {
    events,
    totalCount,
    loading,
    error,
    refetch: fetchEvents, // Manual refresh
    channel, // Expose for debugging
  };
}

