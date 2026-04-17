export const AUDIT_ACTIONS = Object.freeze({
    // Auth
    LOGIN_SUCCESS: 'login.success',
    LOGIN_FAILED: 'login.failed',
    LOGOUT: 'logout',
    PASSWORD_RESET_USED: 'password_reset.used',
    // User
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_BULK_ACTION: 'user.bulk_action',
    // Fees
    PAYMENT_RECORDED: 'fees.payment_recorded',
    SALARY_UPDATED: 'fees.salary_updated',
    // Exam
    EXAM_STATUS_CHANGED: 'exam.status_changed',
    // School
    FEATURE_FLAG_TOGGLED: 'school.feature_flag_toggled',
    PROFILE_UPDATED: 'school.profile_updated',
    // Notice
    NOTICE_BROADCAST: 'notice.broadcast',
    // Proxy
    SUBSTITUTE_ASSIGNED: 'proxy.substitute_assigned',
    // Assignment
    ASSIGNMENT_CREATED: 'assignment.created',
    ASSIGNMENT_UPDATED: 'assignment.updated',
    ASSIGNMENT_DELETED: 'assignment.deleted',
    ASSIGNMENT_SUBMITTED: 'assignment.submitted',
    // Calendar
    EVENT_CREATED: 'calendar.event_created',
    EVENT_UPDATED: 'calendar.event_updated',
    EVENT_DELETED: 'calendar.event_deleted',
    // Compatibility aliases for grouped usages in services
    ASSIGNMENT: Object.freeze({
        CREATED: 'assignment.created',
        UPDATED: 'assignment.updated',
        DELETED: 'assignment.deleted',
        SUBMITTED: 'assignment.submitted',
    }),
    CALENDAR: Object.freeze({
        EVENT_CREATED: 'calendar.event_created',
        EVENT_UPDATED: 'calendar.event_updated',
        EVENT_DELETED: 'calendar.event_deleted',
    }),
    PROXY: Object.freeze({
        REQUEST_CREATED: 'proxy.request_created',
        TEACHER_ASSIGNED: 'proxy.substitute_assigned',
        FREE_PERIOD_MARKED: 'proxy.free_period_marked',
        DIRECT_ASSIGNMENT_CREATED: 'proxy.direct_assignment_created',
        REQUEST_CANCELLED: 'proxy.request_cancelled',
    }),
});
