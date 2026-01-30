// Timetable API Functions
import api from '../../../lib/axios';

// TimeSlot API
export const getTimeSlots = async () => {
    const response = await api.get('/timetable/time-slots');
    return response.data;
};

export const createTimeSlot = async (data) => {
    const response = await api.post('/timetable/time-slots', data);
    return response.data;
};

export const updateTimeSlot = async ({ id, data }) => {
    const response = await api.put(`/timetable/time-slots/${id}`, data);
    return response.data;
};

export const deleteTimeSlot = async (id) => {
    const response = await api.delete(`/timetable/time-slots/${id}`);
    return response.data;
};

// Timetable API
export const getTimetables = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.section) params.append('section', filters.section);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    const response = await api.get(`/timetable/timetables?${params.toString()}`);
    return response.data;
};

export const getTimetableById = async (id) => {
    const response = await api.get(`/timetable/timetables/${id}`);
    return response.data;
};

export const createTimetable = async (data) => {
    const response = await api.post('/timetable/timetables', data);
    return response.data;
};

export const updateTimetableStatus = async ({ id, status }) => {
    const response = await api.patch(`/timetable/timetables/${id}/status`, { status });
    return response.data;
};

export const deleteTimetable = async (id) => {
    const response = await api.delete(`/timetable/timetables/${id}`);
    return response.data;
};

// Timetable Entry API
export const createEntry = async ({ timetableId, data }) => {
    const response = await api.post(`/timetable/timetables/${timetableId}/entries`, data);
    return response.data;
};

export const createBulkEntries = async ({ timetableId, entries }) => {
    const response = await api.post(`/timetable/timetables/${timetableId}/entries/bulk`, { entries });
    return response.data;
};

export const updateEntry = async ({ entryId, data }) => {
    const response = await api.put(`/timetable/entries/${entryId}`, data);
    return response.data;
};

export const deleteEntry = async (entryId) => {
    const response = await api.delete(`/timetable/entries/${entryId}`);
    return response.data;
};

// Teacher Schedule API
export const getTeacherSchedule = async ({ teacherId, academicYear }) => {
    let url = `/timetable/teacher-schedule/${teacherId}`;
    if (academicYear) url += `?academicYear=${academicYear}`;
    const response = await api.get(url);
    return response.data;
};

// Helper: Get teachers for dropdown
export const getTeachers = async () => {
    const response = await api.get('/user?role=teacher&pageSize=100');
    return response.data;
};
