import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock all external dependencies ──────────────────────────────────────────
vi.mock("../../src/module/timetable/Timetable.model.js", () => ({
    TimeSlot: { find: vi.fn(), exists: vi.fn(), findById: vi.fn(), create: vi.fn() },
    Timetable: { findOne: vi.fn(), find: vi.fn(), exists: vi.fn(), create: vi.fn(), deleteOne: vi.fn(),deleteMany: vi.fn() },
    TimetableEntry: { findOne: vi.fn(), find: vi.fn(), insertMany: vi.fn(), deleteMany: vi.fn(), exists: vi.fn() },
    DAYS_OF_WEEK: ["Mon", "Tue", "Wed", "Thu", "Fri"],
}));

vi.mock("../../src/module/proxy/Proxy.model.js", () => ({
    ProxyAssignment: {},
    ProxyRequest: {},
}));

vi.mock("../../src/utils/classSection.util.js", () => ({
    buildClassSectionKey: vi.fn((std, sec) => `${std}-${sec}`),
    getConfiguredClassSections: vi.fn(),
    normalizeClassSection: vi.fn((data) => data),
}));

vi.mock("../../src/utils/teacher.util.js", () => ({
    ensureActiveTeacher: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/config/logger.js", () => ({
    default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createTimeSlot, createEntries, deleteTimeSlot } from "../../src/module/timetable/timetable.service.js";
import { TimeSlot, Timetable, TimetableEntry } from "../../src/module/timetable/Timetable.model.js";
import { getConfiguredClassSections } from "../../src/utils/classSection.util.js";

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const SCHOOL_ID = "school-1";
const TIMETABLE_ID = "tt-1";

// ─── createTimeSlot ───────────────────────────────────────────────────────────
describe("createTimeSlot", () => {
    beforeEach(() => {
        TimeSlot.exists.mockResolvedValue(null);
        TimeSlot.create.mockResolvedValue({ _id: "slot-1", slotNumber: 1, startTime: "09:00", endTime: "09:45" });
    });

    it("creates a time slot when slotNumber is unique", async () => {
        const result = await createTimeSlot(SCHOOL_ID, { slotNumber: 1, startTime: "09:00", endTime: "09:45" });

        expect(TimeSlot.exists).toHaveBeenCalledWith({ schoolId: SCHOOL_ID, slotNumber: 1 });
        expect(TimeSlot.create).toHaveBeenCalled();
        expect(result._id).toBe("slot-1");
    });

    it("throws ConflictError when slotNumber already exists", async () => {
        TimeSlot.exists.mockResolvedValue({ _id: "existing" });

        await expect(
            createTimeSlot(SCHOOL_ID, { slotNumber: 1 })
        ).rejects.toThrow(/already exists/i);

        expect(TimeSlot.create).not.toHaveBeenCalled();
    });
});

// ─── deleteTimeSlot ───────────────────────────────────────────────────────────
describe("deleteTimeSlot", () => {
    it("throws ConflictError when time slot is in use by a timetable entry", async () => {
        TimetableEntry.exists.mockResolvedValue(true);

        await expect(
            deleteTimeSlot(SCHOOL_ID, "slot-99")
        ).rejects.toThrow(/currently in use/i);
    });
});

// ─── createEntries — conflict detection ───────────────────────────────────────
describe("createEntries", () => {
    const mockTimetable = { _id: TIMETABLE_ID, standard: "10", section: "A" };

    beforeEach(() => {
        // School has class 10-A configured
        getConfiguredClassSections.mockResolvedValue({
            keySet: new Set(["10-A"]),
        });
        Timetable.findOne.mockResolvedValue(mockTimetable);
        TimetableEntry.findOne.mockReturnValue({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }); // No conflicts by default
        TimetableEntry.insertMany.mockResolvedValue([{ _id: "e-1" }, { _id: "e-2" }]);
    });

    it("inserts all entries when no teacher conflicts exist", async () => {
        const entries = [
            { teacherId: "teacher-1", dayOfWeek: "Mon", timeSlotId: "slot-1", subject: "Math" },
            { teacherId: "teacher-2", dayOfWeek: "Mon", timeSlotId: "slot-2", subject: "Science" },
        ];

        const result = await createEntries(SCHOOL_ID, TIMETABLE_ID, entries);

        expect(result.created).toBe(2);
        expect(result.failed).toHaveLength(0);
    });

    it("marks an entry as failed when teacher has a scheduling conflict", async () => {
        // First call returns conflict, second call returns null (no conflict)
        TimetableEntry.findOne
            .mockReturnValueOnce({
                populate: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue({
                        _id: "conflict-entry",
                        timetableId: { _id: "tt-other", standard: "9", section: "B" },
                        dayOfWeek: "Mon",
                    })
                })
            })
            .mockReturnValueOnce({ populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });

        // The slot lookup after conflict detected
        TimeSlot.findById = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue({ slotNumber: 1, startTime: "09:00", endTime: "09:45" }),
            }),
        });

        // Only one entry — the conflicting one
        const entries = [
            { teacherId: "teacher-1", dayOfWeek: "Mon", timeSlotId: "slot-1", subject: "Math" },
        ];

        // insertMany returns empty array since nothing goes through
        TimetableEntry.insertMany.mockResolvedValue([]);

        const result = await createEntries(SCHOOL_ID, TIMETABLE_ID, entries);

        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].reason).toMatch(/already assigned/i);
        expect(result.created).toBe(0);
    });

    it("skips conflict check for break periods (entries without teacherId)", async () => {
        const entries = [
            { dayOfWeek: "Mon", timeSlotId: "slot-3", subject: "Break" }, // no teacherId
        ];

        TimetableEntry.insertMany.mockResolvedValue([{ _id: "break-1" }]);

        const result = await createEntries(SCHOOL_ID, TIMETABLE_ID, entries);

        // TimetableEntry.findOne should NOT be called for break periods
        expect(TimetableEntry.findOne).not.toHaveBeenCalled();
        expect(result.created).toBe(1);
        expect(result.failed).toHaveLength(0);
    });

    it("throws NotFoundError when timetable does not exist", async () => {
        Timetable.findOne.mockResolvedValue(null);

        await expect(
            createEntries(SCHOOL_ID, "nonexistent-tt", [{ teacherId: "t1", dayOfWeek: "Mon", timeSlotId: "s1" }])
        ).rejects.toThrow(/timetable not found/i);
    });
});
