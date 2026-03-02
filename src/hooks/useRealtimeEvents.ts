// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

// Neon does not support Realtime -- type stub for backward compatibility

/**
 * useRealtimeEvents Hook
 * 
 * Subscribes to real-time calendar events from Supabase
 * Monitors events table for college/department events
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

  // Enrich event with creator name
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

  // Setup Realtime subscription
  useEffect(() => {
    // Initial fetch
    fetchEvents();

    // Build filter for Realtime subscription
    let filter = `college_id=eq.${options.collegeId}`;
    if (options.departmentId) {
      filter += `&department_id=eq.${options.departmentId}`;
    }

    // Setup Realtime channel
    const eventChannel = supabaseBrowser
      .channel(`events:${options.collegeId}${options.departmentId ? `:${options.departmentId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter,
        },
        async (payload) => {
          console.log('📅 New event created:', payload.new);

          const enrichedEvent = await enrichEvent(payload.new);
          
          // Add to events list
          setEvents((prev) => {
            // Sort by start date
            const updated = [enrichedEvent, ...prev].sort(
              (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
            );
            return updated;
          });
          setTotalCount((prev) => prev + 1);

          // Trigger callback
          if (options.onEventCreated) {
            options.onEventCreated(enrichedEvent);
          }

          // Optional: Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Event Created', {
              body: `${enrichedEvent.title} - ${new Date(enrichedEvent.start_date).toLocaleDateString()}`,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter,
        },
        async (payload) => {
          console.log('📝 Event updated:', payload.new);

          const enrichedEvent = await enrichEvent(payload.new);
          
          // Update existing event
          setEvents((prev) =>
            prev.map((e) => (e.id === enrichedEvent.id ? enrichedEvent : e))
          );

          // Trigger callback
          if (options.onEventUpdated) {
            options.onEventUpdated(enrichedEvent);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
          filter,
        },
        (payload) => {
          console.log('🗑️ Event deleted:', payload.old);

          // Remove deleted event
          setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
          setTotalCount((prev) => Math.max(0, prev - 1));

          // Trigger callback
          if (options.onEventDeleted) {
            options.onEventDeleted(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Events channel status:', status);
      });

    setChannel(eventChannel);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from events channel');
      eventChannel.unsubscribe();
    };
  }, [fetchEvents, options.collegeId, options.departmentId, options.onEventCreated, options.onEventUpdated, options.onEventDeleted, enrichEvent]);

  return {
    events,
    totalCount,
    loading,
    error,
    refetch: fetchEvents,
  };
}

