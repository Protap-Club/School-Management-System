// Calendar API Functions
import api from '../../../lib/axios';

export const calendarApi = {
    // Fetch events for a given month (ISO date strings)
    getEvents: async ({ start, end }) => {
        const response = await api.get('/calendar', { params: { start, end } });
        return response.data?.success && Array.isArray(response.data?.data)
            ? response.data.data
            : [];
    },

    // Create a new calendar event
    createEvent: async (payload) => {
        const response = await api.post('/calendar', payload);
        return response.data;
    },

    // Update an existing calendar event
    updateEvent: async ({ id, payload }) => {
        const response = await api.put(`/calendar/${id}`, payload);
        return response.data;
    },

    // Delete a single calendar event
    deleteEvent: async (id) => {
        const response = await api.delete(`/calendar/${id}`);
        return response.data;
    },

    // Clear all non-exam events for a specific date
    clearDayEvents: async (dateStr) => {
        const response = await api.delete(`/calendar/date/${dateStr}`);
        return response.data;
    },
};
