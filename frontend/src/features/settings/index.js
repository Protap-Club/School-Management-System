// Settings Feature - Public API

// Query Hooks
export {
    settingsKeys,
    useBranding,
    useUpdateTheme,
    useUploadLogo,
    useSchoolFeatures,
    useToggleFeature,
} from './api/queries';

// Constants
export const THEME_COLORS = [
    { name: 'Royal Blue', value: '#2563eb', textColor: '#ffffff' },
    { name: 'Purple', value: '#7c3aed', textColor: '#ffffff' },
    { name: 'Emerald', value: '#059669', textColor: '#ffffff' },
    { name: 'Rose', value: '#e11d48', textColor: '#ffffff' },
    { name: 'Amber', value: '#d97706', textColor: '#ffffff' },
];

export const FEATURE_META = {
    attendance: { label: 'Attendance', description: 'Track student attendance via NFC', color: 'from-blue-100 to-cyan-100', iconColor: 'text-blue-500' },
    notice: { label: 'Notice Board', description: 'School announcements and notifications', color: 'from-indigo-100 to-purple-100', iconColor: 'text-indigo-500' },
    fees: { label: 'Fee Management', description: 'Manage student fees and payments', color: 'from-emerald-100 to-green-100', iconColor: 'text-emerald-500' },
    timetable: { label: 'Timetable', description: 'Class and exam schedules', color: 'from-violet-100 to-purple-100', iconColor: 'text-violet-500' },
    library: { label: 'Library', description: 'Book inventory and borrowing', color: 'from-amber-100 to-orange-100', iconColor: 'text-amber-500' },
    transport: { label: 'Transport', description: 'Bus routes and tracking', color: 'from-rose-100 to-pink-100', iconColor: 'text-rose-500' },
};
