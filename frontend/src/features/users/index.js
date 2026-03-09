// Users Feature - Public API

// Query Hooks
export {
    useUsers,
    useArchivedUsers,
    useUserById,
    useCreateUser,
    useToggleUserStatus,
    useToggleUsersStatus,
    userKeys,
} from './api/queries';

// Constants
export const ROLE_PERMISSIONS = {
    super_admin: ['admin', 'teacher', 'student'],
    admin: ['teacher', 'student'],
    teacher: ['student'],
};

export const ROLE_LABELS = {
    admin: { label: 'Admin', color: 'purple' },
    teacher: { label: 'Teacher', color: 'indigo' },
    student: { label: 'Student', color: 'green' },
};
