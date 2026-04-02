/**
 * Timetable API Service
 * Handles all timetable-related API calls to backend
 */

import api from '../lib/axios';

// ═══════════════════════════════════════════════════════════════
// TimeSlot API
// ═══════════════════════════════════════════════════════════════

export const getTimeSlots = async () => {
    const response = await api.get('/timetables/slots');
    return response.data;
};

export const createTimeSlot = async (data) => {
    // data: { slotNumber, startTime, endTime, slotType?, label? }
    const response = await api.post('/timetables/slots', data);
    return response.data;
};

export const updateTimeSlot = async (id, data) => {
    const response = await api.put(`/timetables/slots/${id}`, data);
    return response.data;
};

export const deleteTimeSlot = async (id) => {
    const response = await api.delete(`/timetables/slots/${id}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Timetable API
// ═══════════════════════════════════════════════════════════════

export const getTimetables = async (filters = {}) => {
    // filters: { standard?, section?, academicYear?, teacherId? }
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.section) params.append('section', filters.section);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.teacherId) params.append('teacherId', filters.teacherId);

    const response = await api.get(`/timetables?${params.toString()}`);
    return response.data;
};

export const getTimetableById = async (id) => {
    // Returns { timetable, entries }
    const response = await api.get(`/timetables/${id}`);
    return response.data;
};

export const createTimetable = async (data) => {
    // data: { standard, section, academicYear }
    const response = await api.post('/timetables', data);
    return response.data;
};

export const deleteTimetable = async (id) => {
    const response = await api.delete(`/timetables/${id}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// TimetableEntry API
// ═══════════════════════════════════════════════════════════════

export const createEntry = async (timetableId, data) => {
    // data: { dayOfWeek, timeSlotId, subject?, teacherId?, roomNumber?, notes? }
    const response = await api.post(`/timetables/${timetableId}/entries`, data);
    return response.data;
};

export const createBulkEntries = async (timetableId, entries) => {
    // entries: Array<{ dayOfWeek, timeSlotId, subject?, teacherId?, roomNumber?, notes? }>
    const response = await api.post(`/timetables/${timetableId}/entries/sync`, { entries });
    return response.data;
};

export const updateEntry = async (entryId, data) => {
    const response = await api.patch(`/timetables/entries/${entryId}`, data);
    return response.data;
};

export const deleteEntry = async (entryId) => {
    const response = await api.delete(`/timetables/entries/${entryId}`);
    return response.data;
};

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule API
// ═══════════════════════════════════════════════════════════════

export const getTeacherSchedule = async (teacherId, academicYear = null) => {
    let url = `/timetables/schedule/${teacherId}`;
    if (academicYear) {
        url += `?academicYear=${academicYear}`;
    }
    const response = await api.get(url);
    return response.data;
};

export const getMySchedule = async () => {
    const response = await api.get('/timetables/schedule/me');
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

// Default time slots for 11AM-5PM school day matching reference design
// Used when backend has no time slots configured
export const DEFAULT_TIME_SLOTS = [
    { slotNumber: 1, startTime: '11:00', endTime: '12:00', slotType: 'CLASS', label: 'Period 1' },
    { slotNumber: 2, startTime: '12:00', endTime: '13:00', slotType: 'CLASS', label: 'Period 2' },
    { slotNumber: 3, startTime: '13:00', endTime: '13:30', slotType: 'BREAK', label: 'Lunch Break' },
    { slotNumber: 4, startTime: '13:30', endTime: '14:30', slotType: 'CLASS', label: 'Period 3' },
    { slotNumber: 5, startTime: '14:30', endTime: '15:30', slotType: 'CLASS', label: 'Period 4' },
    { slotNumber: 6, startTime: '15:30', endTime: '16:00', slotType: 'BREAK', label: 'Short Break' },
    { slotNumber: 7, startTime: '16:00', endTime: '17:00', slotType: 'CLASS', label: 'Period 5' }
];
