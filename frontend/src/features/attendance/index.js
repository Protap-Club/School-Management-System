// Attendance Feature - Public API

// Query Hooks
export {
    attendanceKeys,
    useStudentsWithProfiles,
    useStudents,
    useTeachersWithProfiles,
    useAttendanceByDate,
    useAttendanceSummary,
    useMarkAttendance,
    useMarkBulkAttendance,
} from './api/queries';

// Constants
export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    UNMARKED: 'unmarked',
};
