import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const modelMocks = vi.hoisted(() => ({
    ProxyRequest: {
        findOne: vi.fn(),
        create: vi.fn(),
        countDocuments: vi.fn(),
        find: vi.fn(),
        findByIdAndUpdate: vi.fn(),
    },
    ProxyAssignment: {
        findOne: vi.fn(),
        create: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        find: vi.fn(),
    },
}));

const timetableModelMocks = vi.hoisted(() => ({
    Timetable: { findOne: vi.fn() },
    TimetableEntry: { findOne: vi.fn(), find: vi.fn() },
    TimeSlot: { findOne: vi.fn() },
}));

const userModelMocks = vi.hoisted(() => ({
    find: vi.fn(),
    findById: vi.fn(),
}));

const noticeServiceMocks = vi.hoisted(() => ({
    createNotice: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));

vi.mock("../../src/module/proxy/Proxy.model.js", () => ({
    ProxyRequest: modelMocks.ProxyRequest,
    ProxyAssignment: modelMocks.ProxyAssignment,
}));

vi.mock("../../src/module/timetable/Timetable.model.js", () => ({
    Timetable: timetableModelMocks.Timetable,
    TimetableEntry: timetableModelMocks.TimetableEntry,
    TimeSlot: timetableModelMocks.TimeSlot,
}));

vi.mock("../../src/module/user/model/User.model.js", () => ({
    default: userModelMocks,
}));

vi.mock("../../src/module/notice/notice.service.js", () => noticeServiceMocks);

vi.mock("../../src/config/logger.js", () => ({
    default: loggerMocks,
}));

import {
    assignProxyTeacher,
    createProxyRequest,
    getProxyRequests,
    getTimetableWithProxyOverrides,
    markAsFreePeriod,
} from "../../src/module/proxy/proxy.service.js";

const createLeanQuery = (result) => ({
    lean: vi.fn().mockResolvedValue(result),
});

const createPopulateLeanQuery = (result) => {
    const query = {
        populate: vi.fn(),
        lean: vi.fn(),
    };
    query.populate.mockReturnValue(query);
    query.lean.mockResolvedValue(result);
    return query;
};

const createListQuery = (result) => {
    const query = {
        populate: vi.fn(),
        sort: vi.fn(),
        skip: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn(),
    };
    query.populate.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.lean.mockResolvedValue(result);
    return query;
};

const createSelectLeanQuery = (result) => {
    const query = {
        select: vi.fn(),
        lean: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.lean.mockResolvedValue(result);
    return query;
};

const seedGetProxyRequestsFindCalls = (resolvedStats = []) => {
    const listQuery = createListQuery([{ _id: "r-1" }]);
    const statsQuery = createPopulateLeanQuery(resolvedStats);
    modelMocks.ProxyRequest.find
        .mockReturnValueOnce(listQuery)
        .mockReturnValueOnce(statsQuery);
    modelMocks.ProxyRequest.countDocuments
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(9);
    return { listQuery };
};

describe("proxy.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("createProxyRequest", () => {
        it("rejects invalid date format", async () => {
            await expect(
                createProxyRequest("teacher-1", "school-1", {
                    date: "invalid-date",
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                })
            ).rejects.toThrow("Invalid date format");
        });

        it("rejects past dates", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 14, 9, 0, 0, 0));

            await expect(
                createProxyRequest("teacher-1", "school-1", {
                    date: "2026-04-13",
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                })
            ).rejects.toThrow("Cannot create proxy request for past dates");
        });

        it("rejects when day does not match selected date", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0, 0));

            await expect(
                createProxyRequest("teacher-1", "school-1", {
                    date: "2026-04-14",
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                })
            ).rejects.toThrow("Selected date is Tue");
        });

        it("rejects duplicate proxy request for the same slot and date", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0, 0));

            timetableModelMocks.TimeSlot.findOne.mockReturnValueOnce(
                createLeanQuery({ _id: "slot-1", slotNumber: 2 })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(
                createPopulateLeanQuery({
                    timetableId: { standard: "10", section: "A" },
                    subject: "Math",
                })
            );
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(createLeanQuery({ _id: "existing-request" }));

            await expect(
                createProxyRequest("teacher-1", "school-1", {
                    date: "2026-04-20",
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                })
            ).rejects.toThrow("A proxy request already exists");
        });

        it("rejects if assignment already exists for the same slot and date", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0, 0));

            timetableModelMocks.TimeSlot.findOne.mockReturnValueOnce(
                createLeanQuery({ _id: "slot-1", slotNumber: 2 })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(
                createPopulateLeanQuery({
                    timetableId: { standard: "10", section: "A" },
                    subject: "Math",
                })
            );
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.findOne.mockReturnValueOnce(createLeanQuery({ _id: "existing-assignment" }));

            await expect(
                createProxyRequest("teacher-1", "school-1", {
                    date: "2026-04-20",
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                })
            ).rejects.toThrow("A proxy assignment already exists");
        });

        it("creates a proxy request with normalized date and timetable context", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0, 0));

            timetableModelMocks.TimeSlot.findOne.mockReturnValueOnce(
                createLeanQuery({ _id: "slot-1", slotNumber: 3 })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(
                createPopulateLeanQuery({
                    timetableId: { standard: "8", section: "B" },
                    subject: "Science",
                })
            );
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyRequest.create.mockResolvedValueOnce({ _id: "new-request" });

            await createProxyRequest("teacher-1", "school-1", {
                date: "2026-04-20",
                dayOfWeek: "Mon",
                timeSlotId: "slot-1",
                reason: "Medical leave",
            });

            expect(modelMocks.ProxyRequest.create).toHaveBeenCalledTimes(1);
            const payload = modelMocks.ProxyRequest.create.mock.calls[0][0];
            expect(payload.standard).toBe("8");
            expect(payload.section).toBe("B");
            expect(payload.subject).toBe("Science");
            expect(payload.slotNumber).toBe(3);
            expect(payload.date.getHours()).toBe(0);
            expect(payload.date.getMinutes()).toBe(0);
            expect(payload.status).toBe("pending");
        });
    });

    describe("getProxyRequests", () => {
        it("applies today preset date range", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 14, 10, 30, 0, 0));
            seedGetProxyRequestsFindCalls([{ proxyAssignmentId: { type: "proxy" } }]);

            await getProxyRequests("school-1", { datePreset: "today" });

            const mainQuery = modelMocks.ProxyRequest.countDocuments.mock.calls[0][0];
            const expectedStart = new Date(2026, 3, 14, 0, 0, 0, 0);
            const expectedEnd = new Date(2026, 3, 14, 23, 59, 59, 999);
            expect(mainQuery.date.$gte.getTime()).toBe(expectedStart.getTime());
            expect(mainQuery.date.$lte.getTime()).toBe(expectedEnd.getTime());
        });

        it("applies last7 and last30 presets", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 14, 10, 30, 0, 0));

            seedGetProxyRequestsFindCalls();
            await getProxyRequests("school-1", { datePreset: "last7" });
            const last7Query = modelMocks.ProxyRequest.countDocuments.mock.calls[0][0];
            expect(last7Query.date.$gte.getTime()).toBe(new Date(2026, 3, 8, 0, 0, 0, 0).getTime());

            vi.clearAllMocks();
            seedGetProxyRequestsFindCalls();
            await getProxyRequests("school-1", { datePreset: "last30" });
            const last30Query = modelMocks.ProxyRequest.countDocuments.mock.calls[0][0];
            expect(last30Query.date.$gte.getTime()).toBe(new Date(2026, 2, 16, 0, 0, 0, 0).getTime());
        });

        it("applies custom date range and rejects invalid ranges", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 3, 14, 10, 30, 0, 0));

            seedGetProxyRequestsFindCalls();
            await getProxyRequests("school-1", {
                datePreset: "custom",
                fromDate: "2026-04-01",
                toDate: "2026-04-12",
            });
            const customQuery = modelMocks.ProxyRequest.countDocuments.mock.calls[0][0];
            expect(customQuery.date.$gte.getTime()).toBe(new Date(2026, 3, 1, 0, 0, 0, 0).getTime());
            expect(customQuery.date.$lte.getTime()).toBe(new Date(2026, 3, 12, 23, 59, 59, 999).getTime());

            await expect(
                getProxyRequests("school-1", {
                    datePreset: "custom",
                    fromDate: "2026-04-20",
                    toDate: "2026-04-12",
                })
            ).rejects.toThrow("fromDate cannot be after toDate");
        });

        it("clamps pagination and returns computed stats", async () => {
            const listQuery = createListQuery([{ _id: "req-1" }]);
            const statsQuery = createPopulateLeanQuery([
                { proxyAssignmentId: { type: "proxy" } },
                { proxyAssignmentId: { type: "proxy" } },
                { proxyAssignmentId: { type: "free_period" } },
            ]);

            modelMocks.ProxyRequest.find
                .mockReturnValueOnce(listQuery)
                .mockReturnValueOnce(statsQuery);
            modelMocks.ProxyRequest.countDocuments
                .mockResolvedValueOnce(42)
                .mockResolvedValueOnce(9);

            const result = await getProxyRequests("school-1", {
                page: -5,
                pageSize: 999,
            });

            expect(listQuery.skip).toHaveBeenCalledWith(0);
            expect(listQuery.limit).toHaveBeenCalledWith(100);
            expect(result.pagination.page).toBe(0);
            expect(result.pagination.pageSize).toBe(100);
            expect(result.pagination.totalCount).toBe(42);
            expect(result.stats).toEqual({
                pendingCount: 9,
                assignedProxyCount: 2,
                freePeriodCount: 1,
            });
        });
    });

    describe("assignProxyTeacher", () => {
        it("throws conflict when selected proxy teacher is unavailable", async () => {
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(
                createLeanQuery({
                    _id: "request-1",
                    teacherId: "teacher-original",
                    date: new Date("2026-04-20"),
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                    standard: "10",
                    section: "A",
                    subject: "Math",
                    slotNumber: 2,
                })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(createLeanQuery({ _id: "busy-slot" }));

            await expect(
                assignProxyTeacher("admin-1", "school-1", "request-1", {
                    proxyTeacherId: "teacher-proxy",
                })
            ).rejects.toThrow("Selected teacher is not available");
        });

        it("creates assignment, resolves request, and sends notices on success", async () => {
            const requestDate = new Date("2026-04-20T00:00:00.000Z");
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(
                createLeanQuery({
                    _id: "request-1",
                    teacherId: "teacher-original",
                    date: requestDate,
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                    standard: "10",
                    section: "A",
                    subject: "Math",
                    slotNumber: 2,
                })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.create.mockResolvedValueOnce({ _id: "assignment-1" });
            modelMocks.ProxyRequest.findByIdAndUpdate.mockResolvedValueOnce({});
            userModelMocks.findById.mockReturnValueOnce(createSelectLeanQuery({ _id: "teacher-proxy", name: "John Doe" }));
            noticeServiceMocks.createNotice
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({});

            const result = await assignProxyTeacher("admin-1", "school-1", "request-1", {
                proxyTeacherId: "teacher-proxy",
                notes: "Please cover this class",
            });

            expect(result).toEqual({ _id: "assignment-1" });
            expect(modelMocks.ProxyRequest.findByIdAndUpdate).toHaveBeenCalledWith(
                "request-1",
                expect.objectContaining({
                    status: "resolved",
                    proxyAssignmentId: "assignment-1",
                })
            );
            expect(noticeServiceMocks.createNotice).toHaveBeenCalledTimes(2);
        });

        it("does not fail assignment when notification dispatch fails", async () => {
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(
                createLeanQuery({
                    _id: "request-1",
                    teacherId: "teacher-original",
                    date: new Date("2026-04-20T00:00:00.000Z"),
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                    standard: "10",
                    section: "A",
                    subject: "Math",
                    slotNumber: 2,
                })
            );
            timetableModelMocks.TimetableEntry.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.findOne.mockReturnValueOnce(createLeanQuery(null));
            modelMocks.ProxyAssignment.create.mockResolvedValueOnce({ _id: "assignment-2" });
            modelMocks.ProxyRequest.findByIdAndUpdate.mockResolvedValueOnce({});
            userModelMocks.findById.mockReturnValueOnce(createSelectLeanQuery({ _id: "teacher-proxy", name: "Jane Doe" }));
            noticeServiceMocks.createNotice.mockRejectedValueOnce(new Error("notice service unavailable"));

            const result = await assignProxyTeacher("admin-1", "school-1", "request-1", {
                proxyTeacherId: "teacher-proxy",
            });

            expect(result).toEqual({ _id: "assignment-2" });
            expect(loggerMocks.warn).toHaveBeenCalled();
        });
    });

    describe("markAsFreePeriod", () => {
        it("resolves request and tolerates notification failure", async () => {
            modelMocks.ProxyRequest.findOne.mockReturnValueOnce(
                createLeanQuery({
                    _id: "request-1",
                    teacherId: "teacher-original",
                    date: new Date("2026-04-20T00:00:00.000Z"),
                    dayOfWeek: "Mon",
                    timeSlotId: "slot-1",
                    standard: "10",
                    section: "A",
                    subject: "Math",
                    slotNumber: 2,
                })
            );
            modelMocks.ProxyAssignment.create.mockResolvedValueOnce({ _id: "assignment-free-1" });
            modelMocks.ProxyRequest.findByIdAndUpdate.mockResolvedValueOnce({});
            noticeServiceMocks.createNotice.mockRejectedValueOnce(new Error("notice service unavailable"));

            const result = await markAsFreePeriod("admin-1", "school-1", "request-1", "No substitute available");

            expect(result).toEqual({ _id: "assignment-free-1" });
            expect(modelMocks.ProxyRequest.findByIdAndUpdate).toHaveBeenCalledWith(
                "request-1",
                expect.objectContaining({
                    status: "resolved",
                    proxyAssignmentId: "assignment-free-1",
                })
            );
            expect(loggerMocks.warn).toHaveBeenCalled();
        });
    });

    describe("getTimetableWithProxyOverrides", () => {
        it("applies proxy/free-period overrides when assignment timeSlot is a populated object", async () => {
            timetableModelMocks.Timetable.findOne.mockReturnValueOnce(
                createLeanQuery({ _id: "tt-1", standard: "10", section: "A" })
            );
            timetableModelMocks.TimetableEntry.find.mockReturnValueOnce(
                createPopulateLeanQuery([
                    {
                        _id: "entry-1",
                        dayOfWeek: "Mon",
                        subject: "Math",
                        teacherId: { _id: "teacher-original", name: "Original Teacher" },
                        timeSlotId: { _id: "slot-1", slotNumber: 1 },
                    },
                    {
                        _id: "entry-2",
                        dayOfWeek: "Mon",
                        subject: "Science",
                        teacherId: { _id: "teacher-2", name: "Teacher Two" },
                        timeSlotId: { _id: "slot-2", slotNumber: 2 },
                    },
                ])
            );
            modelMocks.ProxyAssignment.find.mockReturnValueOnce(
                createPopulateLeanQuery([
                    {
                        _id: "assignment-1",
                        dayOfWeek: "Mon",
                        timeSlotId: { _id: "slot-1", slotNumber: 1 },
                        type: "free_period",
                        notes: "Teacher absent",
                        proxyTeacherId: null,
                    },
                ])
            );

            const result = await getTimetableWithProxyOverrides("school-1", "10", "A", "2026-04-20");

            expect(result.entries).toHaveLength(2);
            expect(result.entries[0]).toEqual(
                expect.objectContaining({
                    _id: "entry-1",
                    isProxyOverride: true,
                    proxyAssignmentId: "assignment-1",
                    proxyType: "free_period",
                    teacherId: null,
                })
            );
            expect(result.entries[1].isProxyOverride).toBeUndefined();
        });
    });
});
