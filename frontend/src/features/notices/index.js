// Notices Feature - Public API

// Query Hooks
export {
    noticeKeys,
    useNotices,
    useNotice,
    useCreateNotice,
    useDeleteNotice,
    useClasses,
    useGroups,
    useCreateGroup,
    useDeleteGroup,
} from './api/queries';

// Constants
export const NOTICE_TYPES = {
    NOTICE: 'notice',
    FILE: 'file',
};

export const RECIPIENT_TYPES = {
    ALL: 'all',
    CLASSES: 'classes',
    USERS: 'users',
    STUDENTS: 'students',
    GROUPS: 'groups',
};

export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
