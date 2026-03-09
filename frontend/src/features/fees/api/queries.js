// Fees TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi } from './api';

export const feeKeys = {
    all: ['fees'],
    structures: () => [...feeKeys.all, 'structures'],
    structureList: (filters) => [...feeKeys.structures(), filters],
    allClassesOverview: (academicYear, month) => [...feeKeys.all, 'allClassesOverview', academicYear, month],
    classOverview: (standard, section, academicYear, month) => [...feeKeys.all, 'classOverview', standard, section, academicYear, month],
    yearlySummary: (academicYear) => [...feeKeys.all, 'yearlySummary', academicYear],
    myClasses: (academicYear, month) => [...feeKeys.all, 'myClasses', academicYear, month],
    studentHistory: (studentId, academicYear) => [...feeKeys.all, 'studentHistory', studentId, academicYear],
};

// ── Fee Structure Queries ─────────────────────────────────────

export const useFeeStructures = (filters = {}, enabled = false) => {
    return useQuery({
        queryKey: feeKeys.structureList(filters),
        queryFn: () => feesApi.getFeeStructures(filters),
        enabled: enabled,
    });
};

export const useCreateFeeStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.createFeeStructure,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.structures() });
        },
    });
};

export const useUpdateFeeStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.updateFeeStructure,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.structures() });
        },
    });
};

export const useDeleteFeeStructure = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.deleteFeeStructure,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.structures() });
        },
    });
};

// ── Assignment Mutations ──────────────────────────────────────

export const useGenerateAssignments = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.generateAssignments,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
        },
    });
};

export const useUpdateAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.updateAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
        },
    });
};

// ── Payment Mutations ─────────────────────────────────────────

export const useRecordPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.recordPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
        },
    });
};

// ── Dashboard Queries ─────────────────────────────────────────

export const useAllClassesOverview = (academicYear, month, isAdmin = false) => {
    return useQuery({
        queryKey: feeKeys.allClassesOverview(academicYear, month),
        queryFn: () => feesApi.getAllClassesOverview({ academicYear, month }),
        enabled: !!academicYear && !!month && isAdmin,
    });
};

export const useClassOverview = (standard, section, academicYear, month) => {
    return useQuery({
        queryKey: feeKeys.classOverview(standard, section, academicYear, month),
        queryFn: () => feesApi.getClassOverview({ standard, section, academicYear, month }),
        enabled: !!standard && !!section && !!academicYear && !!month,
    });
};

export const useYearlySummary = (academicYear, isAdmin = false) => {
    return useQuery({
        queryKey: feeKeys.yearlySummary(academicYear),
        queryFn: () => feesApi.getYearlySummary({ academicYear }),
        enabled: !!academicYear && isAdmin,
    });
};

// ── Student History Query ─────────────────────────────────────

export const useStudentFeeHistory = (studentId, academicYear) => {
    return useQuery({
        queryKey: feeKeys.studentHistory(studentId, academicYear),
        queryFn: () => feesApi.getStudentFeeHistory({ studentId, academicYear }),
        enabled: !!studentId,
    });
};

export const useMyClassFees = (academicYear, month, isTeacher = false) => {
    return useQuery({
        queryKey: feeKeys.myClasses(academicYear, month),
        queryFn: () => feesApi.getMyClassFees({ academicYear, month }),
        enabled: !!academicYear && !!month && isTeacher,
    });
};
