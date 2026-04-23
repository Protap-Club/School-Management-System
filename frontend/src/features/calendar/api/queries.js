// Calendar TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { calendarApi } from './api';
import { selectAccessToken } from '../../auth/authSlice';

// ── Query Keys ─────────────────────────────────────────────────────────────
export const calendarKeys = {
    all: ['calendar'],
    events: () => [...calendarKeys.all, 'events'],
    // Key includes the month string so each month gets its own cache entry.
    month: (year, month) => [...calendarKeys.events(), { year, month }],
};

const useProtectedQueryEnabled = (enabled = true) => {
    const accessToken = useSelector(selectAccessToken);
    return Boolean(accessToken) && enabled;
};

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch calendar events for the given month.
 * Results are cached per-month, so navigating back to a previously loaded
 * month is instant — no network round-trip.
 */
export const useCalendarEvents = (year, month) => {
    const enabled = useProtectedQueryEnabled();

    // Build ISO date range for the month
    const startOfMonth = new Date(year, month, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    return useQuery({
        queryKey: calendarKeys.month(year, month),
        queryFn: () =>
            calendarApi.getEvents({
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString(),
            }),
        enabled,
        // Calendar data is unlikely to change mid-session; treat as fresh for 5 min
        // (inherits the global staleTime but stated explicitly for clarity).
        staleTime: 5 * 60 * 1000,
    });
};

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a new event and invalidate the affected month's cache. */
export const useCreateCalendarEvent = (year, month) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: calendarApi.createEvent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
        },
    });
};

/** Update an existing event and invalidate the affected month's cache. */
export const useUpdateCalendarEvent = (year, month) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => calendarApi.updateEvent({ id, payload }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
        },
    });
};

/** Delete a single event and invalidate the affected month's cache. */
export const useDeleteCalendarEvent = (year, month) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: calendarApi.deleteEvent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
        },
    });
};

/** Clear all calendar events on a day and invalidate the affected month's cache. */
export const useClearDayEvents = (year, month) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: calendarApi.clearDayEvents,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
        },
    });
};
