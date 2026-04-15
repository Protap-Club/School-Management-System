// Timetable Feature - Public API

// Query Hooks
export {
    timetableKeys,
    // Time Slots
    useTimeSlots,
    useCreateTimeSlot,
    useUpdateTimeSlot,
    useDeleteTimeSlot,
    // Timetables
    useTimetables,
    useTimetable,
    useCreateTimetable,
    useDeleteTimetable,
    // Entries
    useCreateEntry,
    useUpdateEntry,
    useDeleteEntry,
    // Schedule
    useMySchedule,
    useMyClassSchedule,
    useTeacherSchedule,
    useTeachers,
    useAvailableClasses,
} from './api/queries';

// Constants
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SLOT_TYPES = { CLASS: 'CLASS', BREAK: 'BREAK' };

export const TIMETABLE_STATUS = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' };

export const DAY_MAP = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

export const DAY_MAP_REVERSE = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
    Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

export const DEFAULT_TIME_SLOTS = [
    { slotNumber: 1, startTime: '11:00', endTime: '12:00', slotType: 'CLASS', label: 'Period 1' },
    { slotNumber: 2, startTime: '12:00', endTime: '13:00', slotType: 'CLASS', label: 'Period 2' },
    { slotNumber: 3, startTime: '13:00', endTime: '13:30', slotType: 'BREAK', label: 'Lunch Break' },
    { slotNumber: 4, startTime: '13:30', endTime: '14:30', slotType: 'CLASS', label: 'Period 3' },
    { slotNumber: 5, startTime: '14:30', endTime: '15:30', slotType: 'CLASS', label: 'Period 4' },
    { slotNumber: 6, startTime: '15:30', endTime: '16:00', slotType: 'BREAK', label: 'Short Break' },
    { slotNumber: 7, startTime: '16:00', endTime: '17:00', slotType: 'CLASS', label: 'Period 5' },
];
