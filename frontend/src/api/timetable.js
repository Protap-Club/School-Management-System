/**
 * Timetable API Service
 * Handles all timetable-related API calls to backend
 */

import api from './axios';

// ═══════════════════════════════════════════════════════════════
// TimeSlot API
// ═══════════════════════════════════════════════════════════════

export const getTimeSlots = async () => {
    const response = await api.get('/timetable/time-slots');
    return response.data;
};

export const createTimeSlot = async (data) => {
    // data: { slotNumber, startTime, endTime, slotType?, label? }
    const response = await api.post('/timetable/time-slots', data);
    return response.data;
};

export const updateTimeSlot = async (id, data) => {
    const response = await api.put(`/timetable/time-slots/${id}`, data);
    return response.data;
};

export const deleteTimeSlot = async (id) => {
    const response = await api.delete(`/timetable/time-slots/${id}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Timetable API
// ═══════════════════════════════════════════════════════════════

export const getTimetables = async (filters = {}) => {
    // filters: { standard?, section?, academicYear? }
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.section) params.append('section', filters.section);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    
    const response = await api.get(`/timetable/timetables?${params.toString()}`);
    return response.data;
};

export const getTimetableById = async (id) => {
    // Returns { timetable, entries }
    const response = await api.get(`/timetable/timetables/${id}`);
    return response.data;
};

export const createTimetable = async (data) => {
    // data: { standard, section, academicYear }
    const response = await api.post('/timetable/timetables', data);
    return response.data;
};

export const updateTimetableStatus = async (id, status) => {
    // status: "DRAFT" | "PUBLISHED"
    const response = await api.patch(`/timetable/timetables/${id}/status`, { status });
    return response.data;
};

export const deleteTimetable = async (id) => {
    const response = await api.delete(`/timetable/timetables/${id}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// TimetableEntry API
// ═══════════════════════════════════════════════════════════════

export const createEntry = async (timetableId, data) => {
    // data: { dayOfWeek, timeSlotId, subject?, teacherId?, roomNumber?, notes? }
    const response = await api.post(`/timetable/timetables/${timetableId}/entries`, data);
    return response.data;
};

export const createBulkEntries = async (timetableId, entries) => {
    // entries: Array<{ dayOfWeek, timeSlotId, subject?, teacherId?, roomNumber?, notes? }>
    const response = await api.post(`/timetable/timetables/${timetableId}/entries/bulk`, { entries });
    return response.data;
};

export const updateEntry = async (entryId, data) => {
    const response = await api.put(`/timetable/entries/${entryId}`, data);
    return response.data;
};

export const deleteEntry = async (entryId) => {
    const response = await api.delete(`/timetable/entries/${entryId}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule API
// ═══════════════════════════════════════════════════════════════

export const getTeacherSchedule = async (teacherId, academicYear = null) => {
    let url = `/timetable/teacher-schedule/${teacherId}`;
    if (academicYear) {
        url += `?academicYear=${academicYear}`;
    }
    const response = await api.get(url);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Helper: Get teachers for dropdown (uses existing users API)
// ═══════════════════════════════════════════════════════════════

export const getTeachers = async () => {
    const response = await api.get('/users?role=teacher&pageSize=100');
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Constants (matching backend exactly)
// ═══════════════════════════════════════════════════════════════

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SLOT_TYPES = {
    CLASS: 'CLASS',
    BREAK: 'BREAK'
};

export const TIMETABLE_STATUS = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED'
};

// Day name mapping: full name -> short form (for UI compatibility)
export const DAY_MAP = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat'
};

export const DAY_MAP_REVERSE = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday'
};
