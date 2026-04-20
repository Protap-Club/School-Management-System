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
        ASSIGNMENT_UPDATED: 'proxy.assignment_updated',
    }),
});

/**
 * Valid action_type enum values stored on every AuditLog document.
 * The verb-level category surfaced as a colored badge in the UI.
 */
export const ACTION_TYPES = Object.freeze({
    LOGIN:     'LOGIN',
    LOGOUT:    'LOGOUT',
    CREATE:    'CREATE',
    UPDATE:    'UPDATE',
    DELETE:    'DELETE',
    BROADCAST: 'BROADCAST',
});

/**
 * Maps every raw action string → its ACTION_TYPE enum value.
 * Used by createAuditLog() to auto-populate action_type when not supplied by the caller.
 */
export const ACTION_TYPE_MAP = Object.freeze({
    'login.success':                     ACTION_TYPES.LOGIN,
    'login.failed':                      ACTION_TYPES.LOGIN,
    'logout':                            ACTION_TYPES.LOGOUT,
    'password_reset.used':               ACTION_TYPES.UPDATE,
    'user.created':                      ACTION_TYPES.CREATE,
    'user.updated':                      ACTION_TYPES.UPDATE,
    'user.deleted':                      ACTION_TYPES.DELETE,
    'user.bulk_action':                  ACTION_TYPES.UPDATE,
    'fees.payment_recorded':             ACTION_TYPES.CREATE,
    'fees.salary_updated':               ACTION_TYPES.UPDATE,
    'exam.status_changed':               ACTION_TYPES.UPDATE,
    'school.feature_flag_toggled':       ACTION_TYPES.UPDATE,
    'school.profile_updated':            ACTION_TYPES.UPDATE,
    'notice.broadcast':                  ACTION_TYPES.BROADCAST,
    'proxy.substitute_assigned':         ACTION_TYPES.CREATE,
    'proxy.request_created':             ACTION_TYPES.CREATE,
    'proxy.free_period_marked':          ACTION_TYPES.UPDATE,
    'proxy.direct_assignment_created':   ACTION_TYPES.CREATE,
    'proxy.request_cancelled':           ACTION_TYPES.DELETE,
    'proxy.assignment_updated':          ACTION_TYPES.UPDATE,
    'assignment.created':                ACTION_TYPES.CREATE,
    'assignment.updated':                ACTION_TYPES.UPDATE,
    'assignment.deleted':                ACTION_TYPES.DELETE,
    'assignment.submitted':              ACTION_TYPES.CREATE,
    'calendar.event_created':            ACTION_TYPES.CREATE,
    'calendar.event_updated':            ACTION_TYPES.UPDATE,
    'calendar.event_deleted':            ACTION_TYPES.DELETE,
});

/**
 * Severity levels for audit log entries.
 */
export const SEVERITY_LEVELS = Object.freeze({
    LOW:    'LOW',
    MEDIUM: 'MEDIUM',
    HIGH:   'HIGH',
});

/**
 * Maps action_type → severity.
 *   LOGIN / LOGOUT  → LOW
 *   CREATE / UPDATE → MEDIUM
 *   DELETE / BROADCAST → HIGH
 */
export const SEVERITY_MAP = Object.freeze({
    [ACTION_TYPES.LOGIN]:     SEVERITY_LEVELS.LOW,
    [ACTION_TYPES.LOGOUT]:    SEVERITY_LEVELS.LOW,
    [ACTION_TYPES.CREATE]:    SEVERITY_LEVELS.MEDIUM,
    [ACTION_TYPES.UPDATE]:    SEVERITY_LEVELS.MEDIUM,
    [ACTION_TYPES.DELETE]:    SEVERITY_LEVELS.HIGH,
    [ACTION_TYPES.BROADCAST]: SEVERITY_LEVELS.HIGH,
});

/**
 * Outcome options for an audit log entry.
 */
export const OUTCOME_VALUES = Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILED:  'FAILED',
});
