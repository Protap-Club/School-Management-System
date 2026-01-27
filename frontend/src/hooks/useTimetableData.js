import { useState, useEffect, useCallback } from 'react';
import * as timetableApi from '../api/timetable';

/**
 * Custom hook for managing timetable data via backend API
 * Replaces localStorage-based approach with proper API integration
 */
export const useTimetableData = () => {
    // State
    const [timeSlots, setTimeSlots] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [selectedTimetable, setSelectedTimetable] = useState(null);
    const [entries, setEntries] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ═══════════════════════════════════════════════════════════════
    // Initial Data Fetching
    // ═══════════════════════════════════════════════════════════════

    const fetchTimeSlots = useCallback(async () => {
        try {
            const response = await timetableApi.getTimeSlots();
            setTimeSlots(response.data || []);
        } catch (err) {
            console.error('Failed to fetch time slots:', err);
            setError(err.response?.data?.message || 'Failed to fetch time slots');
        }
    }, []);

    const fetchTimetables = useCallback(async (filters = {}) => {
        try {
            const response = await timetableApi.getTimetables(filters);
            setTimetables(response.data || []);
        } catch (err) {
            console.error('Failed to fetch timetables:', err);
            setError(err.response?.data?.message || 'Failed to fetch timetables');
        }
    }, []);

    const fetchTeachers = useCallback(async () => {
        try {
            const response = await timetableApi.getTeachers();
            setTeachers(response.data || []);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
        }
    }, []);

    const fetchTimetableById = useCallback(async (id) => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await timetableApi.getTimetableById(id);
            setSelectedTimetable(response.data?.timetable || null);
            setEntries(response.data?.entries || []);
        } catch (err) {
            console.error('Failed to fetch timetable:', err);
            setError(err.response?.data?.message || 'Failed to fetch timetable');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchTimeSlots(), fetchTimetables(), fetchTeachers()]);
            setLoading(false);
        };
        init();
    }, [fetchTimeSlots, fetchTimetables, fetchTeachers]);

    // ═══════════════════════════════════════════════════════════════
    // TimeSlot Operations
    // ═══════════════════════════════════════════════════════════════

    const addTimeSlot = useCallback(async (slotData) => {
        try {
            const response = await timetableApi.createTimeSlot(slotData);
            await fetchTimeSlots(); // Refresh list
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to create time slot';
            return { success: false, error: message };
        }
    }, [fetchTimeSlots]);

    const editTimeSlot = useCallback(async (id, slotData) => {
        try {
            const response = await timetableApi.updateTimeSlot(id, slotData);
            await fetchTimeSlots();
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to update time slot';
            return { success: false, error: message };
        }
    }, [fetchTimeSlots]);

    const removeTimeSlot = useCallback(async (id) => {
        try {
            await timetableApi.deleteTimeSlot(id);
            await fetchTimeSlots();
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to delete time slot';
            return { success: false, error: message };
        }
    }, [fetchTimeSlots]);

    // ═══════════════════════════════════════════════════════════════
    // Timetable Operations
    // ═══════════════════════════════════════════════════════════════

    const addTimetable = useCallback(async (timetableData) => {
        try {
            const response = await timetableApi.createTimetable(timetableData);
            await fetchTimetables();
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to create timetable';
            return { success: false, error: message };
        }
    }, [fetchTimetables]);

    const updateStatus = useCallback(async (id, status) => {
        try {
            const response = await timetableApi.updateTimetableStatus(id, status);
            await fetchTimetables();
            if (selectedTimetable?._id === id) {
                setSelectedTimetable(prev => ({ ...prev, status }));
            }
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to update status';
            return { success: false, error: message };
        }
    }, [fetchTimetables, selectedTimetable]);

    const removeTimetable = useCallback(async (id) => {
        try {
            await timetableApi.deleteTimetable(id);
            await fetchTimetables();
            if (selectedTimetable?._id === id) {
                setSelectedTimetable(null);
                setEntries([]);
            }
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to delete timetable';
            return { success: false, error: message };
        }
    }, [fetchTimetables, selectedTimetable]);

    // ═══════════════════════════════════════════════════════════════
    // Entry Operations
    // ═══════════════════════════════════════════════════════════════

    const addEntry = useCallback(async (timetableId, entryData) => {
        try {
            const response = await timetableApi.createEntry(timetableId, entryData);
            // Refresh entries for current timetable
            if (selectedTimetable?._id === timetableId) {
                await fetchTimetableById(timetableId);
            }
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to create entry';
            return { success: false, error: message };
        }
    }, [selectedTimetable, fetchTimetableById]);

    const editEntry = useCallback(async (entryId, entryData) => {
        try {
            const response = await timetableApi.updateEntry(entryId, entryData);
            // Refresh entries
            if (selectedTimetable) {
                await fetchTimetableById(selectedTimetable._id);
            }
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to update entry';
            return { success: false, error: message };
        }
    }, [selectedTimetable, fetchTimetableById]);

    const removeEntry = useCallback(async (entryId) => {
        try {
            await timetableApi.deleteEntry(entryId);
            if (selectedTimetable) {
                await fetchTimetableById(selectedTimetable._id);
            }
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to delete entry';
            return { success: false, error: message };
        }
    }, [selectedTimetable, fetchTimetableById]);

    // ═══════════════════════════════════════════════════════════════
    // Teacher Schedule
    // ═══════════════════════════════════════════════════════════════

    const fetchTeacherSchedule = useCallback(async (teacherId, academicYear = null) => {
        try {
            setLoading(true);
            const response = await timetableApi.getTeacherSchedule(teacherId, academicYear);
            return { success: true, data: response.data };
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to fetch teacher schedule';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // Helper: Select a timetable and load its entries
    // ═══════════════════════════════════════════════════════════════

    const selectTimetable = useCallback(async (timetableId) => {
        if (!timetableId) {
            setSelectedTimetable(null);
            setEntries([]);
            return;
        }
        await fetchTimetableById(timetableId);
    }, [fetchTimetableById]);

    // ═══════════════════════════════════════════════════════════════
    // Return
    // ═══════════════════════════════════════════════════════════════

    return {
        // State
        timeSlots,
        timetables,
        selectedTimetable,
        entries,
        teachers,
        loading,
        error,

        // TimeSlot operations
        addTimeSlot,
        editTimeSlot,
        removeTimeSlot,
        refreshTimeSlots: fetchTimeSlots,

        // Timetable operations
        addTimetable,
        updateStatus,
        removeTimetable,
        selectTimetable,
        refreshTimetables: fetchTimetables,

        // Entry operations
        addEntry,
        editEntry,
        removeEntry,

        // Teacher schedule
        fetchTeacherSchedule,

        // Utilities
        refreshTeachers: fetchTeachers,
        clearError: () => setError(null)
    };
};
