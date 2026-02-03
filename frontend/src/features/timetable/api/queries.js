// Timetable TanStack Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as timetableApi from './api';

export const timetableKeys = {
    all: ['timetable'],
    timeSlots: () => [...timetableKeys.all, 'timeSlots'],
    timetables: () => [...timetableKeys.all, 'timetables'],
    timetable: (id) => [...timetableKeys.timetables(), id],
    timetableFilters: (filters) => [...timetableKeys.timetables(), filters],
    mySchedule: () => [...timetableKeys.all, 'mySchedule'],
    teachers: () => [...timetableKeys.all, 'teachers'],
};

// Time Slots Hooks
export const useTimeSlots = () => {
    return useQuery({
        queryKey: timetableKeys.timeSlots(),
        queryFn: timetableApi.getTimeSlots,
    });
};

export const useCreateTimeSlot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.createTimeSlot,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timeSlots() }),
    });
};

export const useUpdateTimeSlot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.updateTimeSlot,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timeSlots() }),
    });
};

export const useDeleteTimeSlot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.deleteTimeSlot,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timeSlots() }),
    });
};

// Timetables Hooks
export const useTimetables = (filters = {}) => {
    return useQuery({
        queryKey: timetableKeys.timetableFilters(filters),
        queryFn: () => timetableApi.getTimetables(filters),
    });
};

export const useTimetable = (id) => {
    return useQuery({
        queryKey: timetableKeys.timetable(id),
        queryFn: () => timetableApi.getTimetableById(id),
        enabled: !!id,
    });
};

export const useCreateTimetable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.createTimetable,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

export const useUpdateTimetableStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.updateTimetableStatus,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

export const useDeleteTimetable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.deleteTimetable,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

// Entry Hooks
export const useSyncTimetableEntries = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.syncTimetableEntries,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: timetableKeys.timetable(variables.timetableId) });
        },
    });
};

export const useUpdateEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.updateEntry,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

export const useDeleteEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.deleteEntry,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

// My Schedule Hook (for current logged-in teacher)
export const useMySchedule = () => {
    return useQuery({
        queryKey: timetableKeys.mySchedule(),
        queryFn: timetableApi.getMySchedule,
    });
};

// Teachers Hook (for dropdown)
export const useTeachers = () => {
    return useQuery({
        queryKey: timetableKeys.teachers(),
        queryFn: timetableApi.getTeachers,
    });
};
