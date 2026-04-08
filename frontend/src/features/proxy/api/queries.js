import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proxyApi } from "./api";

// Query keys
export const proxyKeys = {
    all: ["proxies"],
    requests: () => [...proxyKeys.all, "requests"],
    requestList: (filters) => [...proxyKeys.requests(), filters],
    myRequests: () => [...proxyKeys.all, "myRequests"],
    myRequestList: (filters) => [...proxyKeys.myRequests(), filters],
    availableTeachers: (params) => [...proxyKeys.all, "availableTeachers", params],
    assignments: (date) => [...proxyKeys.all, "assignments", date],
    timetableWithProxies: (standard, section, date) => [...proxyKeys.all, "timetable", standard, section, date],
    mySchedule: (date) => [...proxyKeys.all, "mySchedule", date],
};

/**
 * Create proxy request (teacher marks unavailable)
 */
export const useCreateProxyRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: proxyApi.createProxyRequest,
        onSuccess: () => {
            // Invalidate my requests and assignments
            queryClient.invalidateQueries({ queryKey: proxyKeys.myRequests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.assignments() });
        },
    });
};

/**
 * Get my proxy requests (teacher)
 */
export const useMyProxyRequests = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.myRequestList(filters),
        queryFn: () => proxyApi.getMyProxyRequests(filters).then(res => res.data),
        ...options,
    });
};

/**
 * Cancel my proxy request (teacher)
 */
export const useCancelProxyRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestId) => proxyApi.cancelProxyRequest(requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proxyKeys.myRequests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.requests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.assignments() });
        },
    });
};

/**
 * Get all proxy requests (admin)
 */
export const useProxyRequests = (filters = {}, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.requestList(filters),
        queryFn: () => proxyApi.getProxyRequests(filters).then(res => res.data),
        ...options,
    });
};

/**
 * Get available teachers for a proxy slot
 */
export const useAvailableTeachers = (params, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.availableTeachers(params),
        queryFn: () => proxyApi.getAvailableTeachers(params).then(res => res.data),
        enabled: !!params?.date && !!params?.timeSlotId,
        ...options,
    });
};

/**
 * Assign proxy teacher (admin)
 */
export const useAssignProxyTeacher = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ requestId, data }) => proxyApi.assignProxyTeacher(requestId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proxyKeys.requests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.assignments() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.myRequests() });
        },
    });
};

/**
 * Mark as free period (admin)
 */
export const useMarkAsFreePeriod = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ requestId, data }) => proxyApi.markAsFreePeriod(requestId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proxyKeys.requests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.assignments() });
        },
    });
};

/**
 * Create direct proxy assignment (admin)
 */
export const useCreateDirectAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: proxyApi.createDirectAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proxyKeys.requests() });
            queryClient.invalidateQueries({ queryKey: proxyKeys.assignments() });
        },
    });
};

/**
 * Get proxy assignments for a date
 */
export const useProxyAssignments = (date, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.assignments(date),
        queryFn: () => proxyApi.getProxyAssignments(date).then(res => res.data),
        enabled: !!date,
        ...options,
    });
};

/**
 * Get timetable with proxy overrides
 */
export const useTimetableWithProxies = (standard, section, date, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.timetableWithProxies(standard, section, date),
        queryFn: () => proxyApi.getTimetableWithProxies(standard, section, date).then(res => res.data),
        enabled: !!standard && !!section && !!date,
        ...options,
    });
};

/**
 * Get teacher's schedule with proxies for a date
 */
export const useMyScheduleWithProxies = (date, options = {}) => {
    return useQuery({
        queryKey: proxyKeys.mySchedule(date),
        queryFn: () => proxyApi.getMyScheduleWithProxies(date).then(res => res.data),
        enabled: !!date,
        ...options,
    });
};
