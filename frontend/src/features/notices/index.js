// Notices Feature - Public API

// Query Hooks
export {
    noticeKeys,
    useNotices,
    useNotice,
    useReceivedNotices,
    useCreateNotice,
    useDeleteNotice,
    useClasses,
    useStudents,
    useTeachers,
    useAllUsers,
    useGroups,
    useCreateGroup,
    useDeleteGroup,
    useAcknowledgeNotice,
    useAcknowledgments,
} from './api/queries';

// Constants
export * from './noticeConstants';

export const NOTICE_TYPES = {
    NOTICE: 'notice',
    FILE: 'file',
};

export * from './useNoticeHandlers';
export * from './NoticeComponents';
