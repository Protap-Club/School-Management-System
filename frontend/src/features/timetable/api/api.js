// Timetable API Functions
import api from '../../../lib/axios';

// TimeSlot API - /api/v1/timetables/slots
export const getTimeSlots = async () => {
    const response = await api.get('/timetables/slots');
    return response.data;
};

export const createTimeSlot = async (data) => {
    const response = await api.post('/timetables/slots', data);
    return response.data;
};

export const updateTimeSlot = async ({ id, data }) => {
    const response = await api.put(`/timetables/slots/${id}`, data);
    return response.data;
};

export const deleteTimeSlot = async (id) => {
    const response = await api.delete(`/timetables/slots/${id}`);
    return response.data;
};

// Timetable API - /api/v1/timetables
export const getTimetables = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.section) params.append('section', filters.section);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    const response = await api.get(`/timetables?${params.toString()}`);
    return response.data;
};

export const getTimetableById = async (id) => {
    const response = await api.get(`/timetables/${id}`);
    return response.data;
};

export const createTimetable = async (data) => {
    const response = await api.post('/timetables', data);
    return response.data;
};

export const updateTimetableStatus = async ({ id, status }) => {
    const response = await api.patch(`/timetables/${id}/status`, { status });
    return response.data;
};

export const deleteTimetable = async (id) => {
    const response = await api.delete(`/timetables/${id}`);
    return response.data;
};

// Timetable Entry API - /api/v1/timetables/:id/entries/sync
export const syncTimetableEntries = async ({ timetableId, entries }) => {
    const response = await api.post(`/timetables/${timetableId}/entries/sync`, { entries });
    return response.data;
};

export const updateEntry = async ({ entryId, data }) => {
    const response = await api.patch(`/timetables/entries/${entryId}`, data);
    return response.data;
};

export const deleteEntry = async (entryId) => {
    const response = await api.delete(`/timetables/entries/${entryId}`);
    return response.data;
};

// Teacher Schedule API - /api/v1/timetables/schedule/me
export const getMySchedule = async () => {
    const response = await api.get('/timetables/schedule/me');
    return response.data;
};

// Helper: Get teachers for dropdown - /api/v1/users?role=teacher
export const getTeachers = async () => {
    const response = await api.get('/users?role=teacher&pageSize=100');
    return response.data;
};
