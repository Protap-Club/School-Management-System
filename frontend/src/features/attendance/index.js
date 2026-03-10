// Attendance Feature — Public API

// Query Hooks
export {
    attendanceKeys,
    useStudents,
    useTeachers,
    useTodayAttendance,
    useLinkNfcTag,
    useMarkNfcAttendance,
    useMarkManualAttendance,
    useProfile,
} from './api/queries';

// Constants
export const ATTENDANCE_STATUS = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
};
