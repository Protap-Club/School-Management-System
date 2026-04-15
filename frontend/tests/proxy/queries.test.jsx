import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const proxyApiMocks = vi.hoisted(() => ({
    createProxyRequest: vi.fn(),
    cancelProxyRequest: vi.fn(),
    assignProxyTeacher: vi.fn(),
    markAsFreePeriod: vi.fn(),
    createDirectAssignment: vi.fn(),
}));

vi.mock("@/features/proxy/api/api", () => ({
    proxyApi: proxyApiMocks,
}));

import {
    proxyKeys,
    useAssignProxyTeacher,
    useCancelProxyRequest,
    useCreateDirectAssignment,
    useCreateProxyRequest,
    useMarkAsFreePeriod,
} from "@/features/proxy/api/queries";

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { queryClient, wrapper };
};

const expectInvalidationKeys = (invalidateSpy, keys) => {
    keys.forEach((queryKey) => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    });
};

describe("proxy query mutation invalidation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("invalidates my proxy requests, assignments, and timetable caches after createProxyRequest", async () => {
        proxyApiMocks.createProxyRequest.mockResolvedValueOnce({ data: { success: true } });

        const { queryClient, wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
        const { result } = renderHook(() => useCreateProxyRequest(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ dayOfWeek: "Mon", date: "2026-04-20" });
        });

        expect(proxyApiMocks.createProxyRequest).toHaveBeenCalled();
        expectInvalidationKeys(invalidateSpy, [
            proxyKeys.myRequests(),
            proxyKeys.assignments(),
            ["timetable", "mySchedule"],
            ["timetable", "teacherSchedule"],
        ]);
    });

    it("invalidates request buckets and timetable caches after cancelProxyRequest", async () => {
        proxyApiMocks.cancelProxyRequest.mockResolvedValueOnce({ data: { success: true } });

        const { queryClient, wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
        const { result } = renderHook(() => useCancelProxyRequest(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync("request-1");
        });

        expect(proxyApiMocks.cancelProxyRequest).toHaveBeenCalledWith("request-1");
        expectInvalidationKeys(invalidateSpy, [
            proxyKeys.myRequests(),
            proxyKeys.requests(),
            proxyKeys.assignments(),
            ["timetable", "mySchedule"],
            ["timetable", "teacherSchedule"],
        ]);
    });

    it("invalidates request buckets and timetable caches after assignProxyTeacher", async () => {
        proxyApiMocks.assignProxyTeacher.mockResolvedValueOnce({ data: { success: true } });

        const { queryClient, wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
        const { result } = renderHook(() => useAssignProxyTeacher(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                requestId: "request-1",
                data: { proxyTeacherId: "teacher-1" },
            });
        });

        expect(proxyApiMocks.assignProxyTeacher).toHaveBeenCalledWith("request-1", { proxyTeacherId: "teacher-1" });
        expectInvalidationKeys(invalidateSpy, [
            proxyKeys.requests(),
            proxyKeys.assignments(),
            proxyKeys.myRequests(),
            ["timetable", "mySchedule"],
            ["timetable", "teacherSchedule"],
        ]);
    });

    it("invalidates request buckets and timetable caches after markAsFreePeriod", async () => {
        proxyApiMocks.markAsFreePeriod.mockResolvedValueOnce({ data: { success: true } });

        const { queryClient, wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
        const { result } = renderHook(() => useMarkAsFreePeriod(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                requestId: "request-1",
                data: { notes: "No teacher available" },
            });
        });

        expect(proxyApiMocks.markAsFreePeriod).toHaveBeenCalledWith("request-1", { notes: "No teacher available" });
        expectInvalidationKeys(invalidateSpy, [
            proxyKeys.requests(),
            proxyKeys.assignments(),
            proxyKeys.myRequests(),
            ["timetable", "mySchedule"],
            ["timetable", "teacherSchedule"],
        ]);
    });

    it("invalidates assignment buckets and timetable caches after createDirectAssignment", async () => {
        proxyApiMocks.createDirectAssignment.mockResolvedValueOnce({ data: { success: true } });

        const { queryClient, wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
        const { result } = renderHook(() => useCreateDirectAssignment(), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                originalTeacherId: "teacher-original",
                proxyTeacherId: "teacher-proxy",
                type: "proxy",
            });
        });

        expect(proxyApiMocks.createDirectAssignment).toHaveBeenCalled();
        expectInvalidationKeys(invalidateSpy, [
            proxyKeys.requests(),
            proxyKeys.assignments(),
            ["timetable", "mySchedule"],
            ["timetable", "teacherSchedule"],
        ]);
    });
});
