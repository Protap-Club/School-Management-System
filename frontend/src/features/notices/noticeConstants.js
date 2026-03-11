export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', // Documents
                            'png', 'jpg', 'jpeg', // Images
                            'mp4', 'mov', 'avi'   // Videos
];
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi'];

export const RECIPIENT_LABELS = { all: 'Entire School', students: 'Students', users: 'Selected Users', groups: 'Groups' };

export const SELECTION_VALIDATORS = {
    classes: { list: 'selectedClasses', msg: 'Please select at least one class' },
    users: { list: 'selectedUsers', msg: 'Please select at least one user' },
    students: { list: 'selectedStudents', msg: 'Please select at least one student' },
    groups: { list: 'selectedGroups', msg: 'Please select at least one group' },
};

export const RECIPIENT_MAP = {
    school: { type: 'all', key: null }, allStudents: { type: 'students', key: null },
    classes: { type: 'classes', key: 'selectedClasses' }, users: { type: 'users', key: 'selectedUsers' },
    students: { type: 'students', key: 'selectedStudents' }, groups: { type: 'groups', key: 'selectedGroups' },
};

export const MODAL_OVERLAY = 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
