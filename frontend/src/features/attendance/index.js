// Attendance Feature - Public API

// Query Hooks
export {
    attendanceKeys,
    useStudents,
    useTeachers,
    useLinkNfcTag,
    useMarkNfcAttendance,
} from './api/queries';

// Constants
export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    UNMARKED: 'unmarked',
};
