// Fees TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi } from './api';
import { useAuth } from '../../auth';
import { patchTeacherExpectedSalaryInUsersCache } from '../../users/api/cache';

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
    penaltyTypes: () => [...feeKeys.all, 'penaltyTypes'],
    penaltyStudents: (filters) => [...feeKeys.all, 'penaltyStudents', filters],
    penalties: (filters) => [...feeKeys.all, 'penalties', filters],
};

// ── Fee Type Queries ──────────────────────────────────────────

export const useFeeTypes = (config = {}) => {
    const { user, accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.feeTypes(),
        queryFn: feesApi.getFeeTypes,
        ...config,
        enabled: (config.enabled !== false) && !!user && !!accessToken,
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

export const usePenaltyTypes = (config = {}) => {
    const { user, accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.penaltyTypes(),
        queryFn: feesApi.getPenaltyTypes,
        ...config,
        enabled: (config.enabled !== false) && !!user && !!accessToken,
    });
};

export const useCreatePenaltyType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.createPenaltyType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.penaltyTypes() });
        },
    });
};

// ── Fee Structure Queries ─────────────────────────────────────

export const useFeeStructures = (filters = {}, enabled = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.structureList(filters),
        queryFn: () => feesApi.getFeeStructures(filters),
        enabled: enabled && !!accessToken,
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
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.allClassesOverview(academicYear, month),
        queryFn: () => feesApi.getAllClassesOverview({ academicYear, month }),
        enabled: !!academicYear && !!month && isAdmin && !!accessToken,
    });
};

export const useClassOverview = (standard, section, academicYear, month) => {
    const { user, accessToken } = useAuth();
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    return useQuery({
        queryKey: feeKeys.classOverview(standard, section, academicYear, month),
        queryFn: () => feesApi.getClassOverview({ standard, section, academicYear, month }),
        enabled: !!standard && !!section && !!academicYear && !!month && isAdmin && !!accessToken,
    });
};

export const useYearlySummary = (academicYear, isAdmin = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.yearlySummary(academicYear),
        queryFn: () => feesApi.getYearlySummary({ academicYear }),
        enabled: !!academicYear && isAdmin && !!accessToken,
    });
};

// ── Student History Query ─────────────────────────────────────

export const useStudentFeeHistory = (studentId, academicYear) => {
    const { user, accessToken } = useAuth();
    const isAuthorized = ['admin', 'super_admin', 'student'].includes(user?.role);
    return useQuery({
        queryKey: feeKeys.studentHistory(studentId, academicYear),
        queryFn: () => feesApi.getStudentFeeHistory({ studentId, academicYear }),
        enabled: !!studentId && !!academicYear && isAuthorized && !!accessToken,
    });
};

export const useMyFees = (filters = {}, isStudent = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.myFees(filters),
        queryFn: () => feesApi.getMyFees(filters),
        enabled: isStudent && !!accessToken,
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
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.salaryList(filters),
        queryFn: () => salaryApi.getSalaries(filters),
        enabled: enabled && !!accessToken,
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
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.mySalary(filters),
        queryFn: () => salaryApi.getMySalary(filters),
        enabled: enabled && !!accessToken,
    });
};

export const useUpdateTeacherProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: salaryApi.updateTeacherProfile,
        onSuccess: (_response, variables) => {
            patchTeacherExpectedSalaryInUsersCache(
                queryClient,
                variables.id,
                variables.data.expectedSalary
            );
        },
    });
};

// ── Student Penalty Hooks ─────────────────────────────────────

export const useStudentsByClass = (standard, section, enabled = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: [...feeKeys.all, 'studentsByClass', standard, section],
        queryFn: () => feesApi.getStudentsByClass({ standard, section }),
        enabled: enabled && !!standard && !!section && !!accessToken,
    });
};

export const usePenaltyStudentsByClass = (filters = {}, enabled = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.penaltyStudents(filters),
        queryFn: () => feesApi.getPenaltyStudentsByClass(filters),
        enabled: enabled && !!filters.standard && !!filters.section && !!accessToken,
    });
};

export const useStudentPenalties = (filters = {}, enabled = false) => {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: feeKeys.penalties(filters),
        queryFn: () => feesApi.getStudentPenalties(filters),
        enabled: enabled && !!filters.standard && !!filters.section && !!filters.studentId && !!accessToken,
    });
};

export const useCreateStudentPenalty = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: feesApi.createStudentPenalty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: feeKeys.all });
        },
    });
};

