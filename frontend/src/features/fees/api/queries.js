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
    studentHistory: (studentId, academicYear) => [...feeKeys.all, 'studentHistory', studentId, academicYear],
    salaries: () => [...feeKeys.all, 'salaries'],
    salaryList: (filters) => [...feeKeys.salaries(), filters],
    mySalary: (filters) => [...feeKeys.all, 'mySalary', filters],
    myFees: (filters) => [...feeKeys.all, 'myFees', filters],
    feeTypes: () => [...feeKeys.all, 'feeTypes'],
};

// ── Fee Type Queries ──────────────────────────────────────────

export const useFeeTypes = (config = {}) => {
    return useQuery({
        queryKey: feeKeys.feeTypes(),
        queryFn: feesApi.getFeeTypes,
        ...config,
    });
};

export const useCreateFeeType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.createFeeType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.feeTypes() });
        },
    });
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
    return useMutation({
        mutationFn: feesApi.createFeeStructure,
        // NOTE: No onSuccess invalidation — handleCreateStructure batch-invalidates
        // after all generate calls complete, preventing request floods.
    });
};

export const useUpdateFeeStructure = () => {
    return useMutation({
        mutationFn: feesApi.updateFeeStructure,
        // NOTE: No onSuccess invalidation — handleUpdateStructure batch-invalidates
        // after all generate calls complete, preventing request floods.
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
    return useMutation({
        mutationFn: feesApi.generateAssignments,
        // NOTE: No onSuccess invalidation here — callers (handleCreateStructure, handleUpdateStructure)
        // batch-invalidate once after all generate calls complete, preventing request floods.
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

export const useMyFees = (filters = {}, isStudent = false) => {
    return useQuery({
        queryKey: feeKeys.myFees(filters),
        queryFn: () => feesApi.getMyFees(filters),
        enabled: isStudent,
    });
};

// ── Salary Hooks ──────────────────────────────────────────────

import { salaryApi } from './salary-api';

export const useCreateSalary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: salaryApi.createSalary,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.salaries() });
            queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidate users to refresh salary display in rows
        },
    });
};

export const useSalaries = (filters = {}, enabled = true) => {
    return useQuery({
        queryKey: feeKeys.salaryList(filters),
        queryFn: () => salaryApi.getSalaries(filters),
        enabled: enabled,
    });
};

export const useUpdateSalaryStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: salaryApi.updateSalaryStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.salaries() });
            queryClient.invalidateQueries({ queryKey: feeKeys.mySalary() });
        },
    });
};

export const useMySalary = (filters = {}, enabled = true) => {
    return useQuery({
        queryKey: feeKeys.mySalary(filters),
        queryFn: () => salaryApi.getMySalary(filters),
        enabled: enabled,
    });
};

export const useUpdateTeacherProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: salaryApi.updateTeacherProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};
