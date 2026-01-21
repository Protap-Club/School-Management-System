/**
 * Feature Flags - Available school features
 */

export const SCHOOL_FEATURES = {
    ATTENDANCE: { key: 'attendance', label: 'Attendance Management', description: 'Track student attendance via NFC' },
    FEES: { key: 'fees', label: 'Fee Management', description: 'Manage student fees and payments' },
    TIMETABLE: { key: 'timetable', label: 'Timetable', description: 'Class and exam schedules' },
    LIBRARY: { key: 'library', label: 'Library Management', description: 'Book inventory and borrowing' },
    TRANSPORT: { key: 'transport', label: 'Transport Management', description: 'Bus routes and tracking' },
    NOTICE: { key: 'notice', label: 'Notice Board', description: 'School announcements and notifications' },
};

/**
 * Get all feature keys as array
 */
export const getFeatureKeys = () => Object.values(SCHOOL_FEATURES).map(f => f.key);

/**
 * Get feature by key
 */
export const getFeatureByKey = (key) => Object.values(SCHOOL_FEATURES).find(f => f.key === key);

/**
 * Check if a feature key is valid
 */
export const isValidFeatureKey = (key) => getFeatureKeys().includes(key);
