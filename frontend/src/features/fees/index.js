// Fees Feature - Public API

// Query Hooks
export {
    feeKeys,
    useFeeStructures,
    useCreateFeeStructure,
    useUpdateFeeStructure,
    useDeleteFeeStructure,
    useGenerateAssignments,
    useUpdateAssignment,
    useRecordPayment,
    useAllClassesOverview,
    useClassOverview,
    useYearlySummary,
    useMyClassFees,
    useStudentFeeHistory,
} from './api/queries';

// Constants
export const FEE_TYPES = ['TUITION', 'EXAM', 'LAB', 'LIBRARY', 'TRANSPORT', 'SPORTS', 'OTHER'];

export const FEE_TYPE_LABELS = {
    TUITION: 'Tuition',
    EXAM: 'Exam',
    LAB: 'Lab',
    LIBRARY: 'Library',
    TRANSPORT: 'Transport',
    SPORTS: 'Sports',
    OTHER: 'Other',
};

export const FREQUENCY_OPTIONS = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'];

export const FREQUENCY_LABELS = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    ONE_TIME: 'One Time',
};

export const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'];

export const PAYMENT_MODE_LABELS = {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    ONLINE: 'Online',
};

export const FEE_STATUS_OPTIONS = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'];

export const STATUS_COLORS = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    PARTIAL: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    WAIVED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

export const MONTH_LABELS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
