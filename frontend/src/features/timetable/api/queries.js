import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as timetableApi from "./api";
import { useSchoolClasses } from "../../../hooks/useSchoolClasses";

export const timetableKeys = {
    all: ["timetable"],
    timeSlots: () => [...timetableKeys.all, "timeSlots"],
    timetables: () => [...timetableKeys.all, "timetables"],
    timetable: (id) => [...timetableKeys.timetables(), id],
    timetableFilters: (filters) => [...timetableKeys.timetables(), filters],
    mySchedule: (date) => [...timetableKeys.all, "mySchedule", date || "default"],
    teacherSchedule: (id, year) => [...timetableKeys.all, 'teacherSchedule', id, year],
    teachers: () => [...timetableKeys.all, "teachers"],
    myClassSchedule: () => [...timetableKeys.all, "myClassSchedule"],
};

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

export const useTimetables = (filters = {}, enabled = true) => {
    const query = useQuery({
        queryKey: timetableKeys.timetableFilters(filters),
        queryFn: () => timetableApi.getTimetables(filters),
        enabled,
    });

    useEffect(() => {
        if (!enabled) return undefined;

        const handleCustomClassesUpdate = () => {
            query.refetch();
        };

        window.addEventListener("customClassesUpdated", handleCustomClassesUpdate);
        return () => {
            window.removeEventListener("customClassesUpdated", handleCustomClassesUpdate);
        };
    }, [enabled, query.refetch]);

    return query;
};

export const useTimetable = (id, enabled = true) => {
    return useQuery({
        queryKey: timetableKeys.timetable(id),
        queryFn: () => timetableApi.getTimetableById(id),
        enabled: enabled && !!id,
    });
};

export const useCreateTimetable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.createTimetable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() });
        },
    });
};

export const useDeleteTimetable = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.deleteTimetable,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.timetables() }),
    });
};

export const useCreateEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.createEntry,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: timetableKeys.timetable(variables.timetableId) });
        },
    });
};

export const useUpdateEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.updateEntry,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
    });
};

export const useDeleteEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: timetableApi.deleteEntry,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
    });
};

export const useMySchedule = (date = null, enabled = true) => {
    return useQuery({
        queryKey: timetableKeys.mySchedule(date),
        queryFn: () => timetableApi.getMySchedule(date),
        enabled,
    });
};

export const useMyClassSchedule = (enabled = true) => {
    return useQuery({
        queryKey: timetableKeys.myClassSchedule(),
        queryFn: timetableApi.getMyClassSchedule,
        enabled,
    });
};

export const useTeacherSchedule = (teacherId, academicYear = null, enabled = true) => {
    return useQuery({
        queryKey: timetableKeys.teacherSchedule(teacherId, academicYear),
        queryFn: () => timetableApi.getTeacherSchedule(teacherId, academicYear),
        enabled: enabled && !!teacherId,
    });
};

export const useTeachers = (enabled = true) => {
    return useQuery({
        queryKey: timetableKeys.teachers(),
        queryFn: timetableApi.getTeachers,
        enabled,
    });
};

export const useAvailableClasses = (enabled = true) => {
    return useSchoolClasses({ enabled });
};
