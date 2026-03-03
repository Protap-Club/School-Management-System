import { useState, useEffect, useCallback } from 'react';
import * as timetableApi from '../api/timetable';
import * as schoolApi from '../api/school';
import { DEFAULT_TIME_SLOTS } from '../api/timetable';

/**
 * Custom hook for managing timetable data via backend API
 * Role-aware: Admins get full access, Teachers only get time slots and own schedule
 * @param {string} userRole - 'admin', 'super_admin', or 'teacher'
 * @param {string} userId - Current user's ID (for teacher schedule)
 */
export const useTimetableData = (userRole = 'admin', userId = null) => {
    // Determine if user is admin (can access all endpoints)
    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    const isTeacher = userRole === 'teacher';

    // State
    const [timeSlots, setTimeSlots] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [selectedTimetable, setSelectedTimetable] = useState(null);
    const [entries, setEntries] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [availableClasses, setAvailableClasses] = useState({ standards: [], sections: [], subjects: [], rooms: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ═══════════════════════════════════════════════════════════════
    // Initial Data Fetching
    // ═══════════════════════════════════════════════════════════════

    const fetchTimeSlots = useCallback(async () => {
        try {
            const response = await timetableApi.getTimeSlots();
            // Backend returns { success, data: [...] }
            let slots = response.data || [];

            // If no slots exist and user is admin, create default slots
            if (slots.length === 0 && isAdmin) {
                console.info('No time slots found, creating default 11AM-5PM schedule...');

                // Create each default slot in backend
                for (const defaultSlot of DEFAULT_TIME_SLOTS) {
                    try {
                        await timetableApi.createTimeSlot({
                            slotNumber: defaultSlot.slotNumber,
                            startTime: defaultSlot.startTime,
                            endTime: defaultSlot.endTime,
                            slotType: defaultSlot.slotType,
                            label: defaultSlot.label
                        });
                    } catch (createErr) {
                        console.error('Failed to create slot:', defaultSlot.label, createErr);
                    }
                }

                // Fetch again to get slots with proper MongoDB IDs
                const refreshResponse = await timetableApi.getTimeSlots();
                slots = refreshResponse.data?.slots || [];
                console.info('Created and fetched', slots.length, 'time slots');
            }

            // Use fetched slots if available, otherwise fallback to defaults (for display only)
            if (slots.length > 0) {
                setTimeSlots(slots);
            } else {
                console.warn('No time slots available, using defaults for display (read-only)');
                setTimeSlots(DEFAULT_TIME_SLOTS);
            }
        } catch (err) {
            console.error('Failed to fetch time slots:', err);
            // On error, fall back to default time slots for display
            setTimeSlots(DEFAULT_TIME_SLOTS);
            setError(err.response?.data?.message || 'Failed to fetch time slots');
        }
    }, [isAdmin]);

    const fetchTimetables = useCallback(async (filters = {}) => {
        try {
            const response = await timetableApi.getTimetables(filters);
            // Backend returns { success, data: [...] }
            setTimetables(response.data || []);
        } catch (err) {
            console.error('Failed to fetch timetables:', err);
            setError(err.response?.data?.message || 'Failed to fetch timetables');
        }
    }, []);

    const fetchTeachers = useCallback(async () => {
        try {
            const response = await timetableApi.getTeachers();
            console.log('DEBUG fetchTeachers response:', response);
            // Backend returns { success: true, data: { users: [...], pagination: {...} } }
            const teachersList = response.data?.users || [];
            console.log('DEBUG teachers extracted:', teachersList);
            setTeachers(teachersList);
            if (teachersList.length === 0) {
                console.warn('No teachers returned from backend');
            }
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
            setError(err.response?.data?.message || 'Failed to fetch teachers');
            setTeachers([]);
        }
    }, []);

    const fetchAvailableClasses = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const response = await schoolApi.getSchoolClasses();
            if (response.success) {
                setAvailableClasses(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch school classes:', err);
        }
    }, [isAdmin]);

    const fetchTimetableById = useCallback(async (id) => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await timetableApi.getTimetableById(id);
            console.log('DEBUG fetchTimetableById response:', response);
            // Response is { success, data: { timetable, entries } } from backend
            // API returns response.data, so response here = { success, data: { timetable, entries } }
            const timetable = response?.data?.timetable || response?.timetable || null;
            const entriesData = response?.data?.entries || response?.entries || [];
            console.log('DEBUG extracted timetable:', timetable, 'entries:', entriesData);
            setSelectedTimetable(timetable);
            setEntries(entriesData);
        } catch (err) {
            console.error('Failed to fetch timetable:', err);
            setError(err.response?.data?.message || 'Failed to fetch timetable');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount - role-aware
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            // Time slots are accessible to all authenticated users
            await fetchTimeSlots();

            // Admin and Teachers: fetch timetables list and teachers
            // Teachers only see classes they're assigned to
            if (isAdmin) {
                await Promise.all([fetchTimetables(), fetchTeachers(), fetchAvailableClasses()]);
            } else if (isTeacher && userId) {
                // Pass userId as teacherId filter so teacher only sees their assigned classes
                await Promise.all([fetchTimetables({ teacherId: userId }), fetchTeachers()]);
            }
            setLoading(false);
        };
        init();
    }, [fetchTimeSlots, fetchTimetables, fetchTeachers, fetchAvailableClasses, isAdmin, isTeacher, userId]);

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
        availableClasses,
        loading,
        error,

        // TimeSlot operations
        addTimeSlot,
        editTimeSlot,
        removeTimeSlot,
        refreshTimeSlots: fetchTimeSlots,

        // Timetable operations
        addTimetable,
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
        refreshAvailableClasses: fetchAvailableClasses,
        clearError: () => setError(null)
    };
};
