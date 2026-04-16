import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock all Mongoose models before importing the service ---
vi.mock("../../src/module/proxy/Proxy.model.js", () => ({
    ProxyRequest: { findOne: vi.fn(), create: vi.fn() },
    ProxyAssignment: { findOne: vi.fn() },
}));

vi.mock("../../src/module/timetable/Timetable.model.js", () => ({
    TimetableEntry: { findOne: vi.fn() },
    TimeSlot: { findOne: vi.fn() },
    Timetable: { findOne: vi.fn() },
}));

vi.mock("../../src/module/user/model/User.model.js", () => ({
    default: { find: vi.fn() },
}));

vi.mock("../../src/module/notice/notice.service.js", () => ({
    createNotice: vi.fn(),
}));

vi.mock("../../src/config/logger.js", () => ({
    default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Import after mocks are set up
import { checkTeacherAvailability, createProxyRequest } from "../../src/module/proxy/proxy.service.js";
import { TimetableEntry, TimeSlot } from "../../src/module/timetable/Timetable.model.js";
import { ProxyRequest, ProxyAssignment } from "../../src/module/proxy/Proxy.model.js";

// ─── Shared constants ────────────────────────────────────────────────────────
const SCHOOL_ID = "school-1";
const TEACHER_ID = "teacher-1";
const TIME_SLOT_ID = "slot-1";

// ─── checkTeacherAvailability ─────────────────────────────────────────────────
describe("checkTeacherAvailability", () => {
    const TOMORROW = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const DAY_OF_WEEK = DAYS[TOMORROW.getDay()];

    beforeEach(() => {
        TimetableEntry.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
            populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        });
        ProxyAssignment.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    });

    it("returns available:true when teacher has no timetable entry or proxy assignment", async () => {
        const result = await checkTeacherAvailability(
            SCHOOL_ID, TEACHER_ID, TOMORROW, DAY_OF_WEEK, TIME_SLOT_ID
        );

        expect(result).toEqual({ available: true });
        expect(TimetableEntry.findOne).toHaveBeenCalledWith({
            schoolId: SCHOOL_ID,
            teacherId: TEACHER_ID,
            dayOfWeek: DAY_OF_WEEK,
            timeSlotId: TIME_SLOT_ID,
        });
    });

    it("returns available:false when teacher has a regular class at that slot", async () => {
        TimetableEntry.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({
                _id: "entry-1",
                teacherId: TEACHER_ID,
                dayOfWeek: DAY_OF_WEEK,
            }),
            populate: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue({
                    _id: "entry-1",
                    teacherId: TEACHER_ID,
                    dayOfWeek: DAY_OF_WEEK,
                })
            })
        });

        const result = await checkTeacherAvailability(
            SCHOOL_ID, TEACHER_ID, TOMORROW, DAY_OF_WEEK, TIME_SLOT_ID
        );

        expect(result.available).toBe(false);
        expect(result.reason).toMatch(/regular class/i);
        // Should NOT query proxy assignments if timetable check already failed
        expect(ProxyAssignment.findOne).not.toHaveBeenCalled();
    });

    it("returns available:false when teacher is already assigned as proxy for that slot", async () => {
        // No regular timetable entry…
        TimetableEntry.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
            populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        });
        // …but an active proxy assignment exists
        ProxyAssignment.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({
                _id: "assignment-1",
                teacherId: TEACHER_ID,
                date: TOMORROW,
            })
        });

        const result = await checkTeacherAvailability(
            SCHOOL_ID, TEACHER_ID, TOMORROW, DAY_OF_WEEK, TIME_SLOT_ID
        );

        expect(result.available).toBe(false);
        expect(result.reason).toMatch(/already assigned as proxy/i);
    });
});

// ─── createProxyRequest ───────────────────────────────────────────────────────
describe("createProxyRequest", () => {
    // Use a fixed future date to avoid any timezone serialization mismatches
    const DATE_ISO = "2030-05-15"; 
    const DAY_OF_WEEK = "Wed"; // 2030-05-15 is a Wednesday

    const baseData = {
        date: DATE_ISO,
        dayOfWeek: DAY_OF_WEEK,
        timeSlotId: TIME_SLOT_ID,
        reason: "Medical appointment",
    };

    beforeEach(() => {
        TimeSlot.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ _id: TIME_SLOT_ID, label: "Period 1" })
        });
        TimetableEntry.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({
                _id: "entry-1",
                timetableId: { standard: "10", section: "A" },
            }),
            populate: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue({
                    _id: "entry-1",
                    timetableId: { standard: "10", section: "A" },
                })
            })
        });
        ProxyRequest.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null) // No duplicate
        });
        ProxyAssignment.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null) // No active assignment already
        });
        ProxyRequest.create.mockResolvedValue({ _id: "req-1", ...baseData });
    });

    it("throws BadRequestError when date does not match the given dayOfWeek", async () => {
        // Build a mismatched dayOfWeek ("Wed" => "Thu")
        const wrongDay = "Thu";

        await expect(
            createProxyRequest(TEACHER_ID, SCHOOL_ID, { ...baseData, dayOfWeek: wrongDay })
        ).rejects.toThrow(/Please select a/i);
    });

    it("throws BadRequestError when the date is in the past", async () => {
        const pastDateISO = "2020-05-15";
        const pastDayOfWeek = "Fri"; // 2020-05-15 was a Friday

        await expect(
            createProxyRequest(TEACHER_ID, SCHOOL_ID, {
                ...baseData,
                date: pastDateISO,
                dayOfWeek: pastDayOfWeek,
            })
        ).rejects.toThrow(/past dates/i);
    });

    it("throws NotFoundError when no time slot exists for the given id", async () => {
        TimeSlot.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null)
        });

        await expect(
            createProxyRequest(TEACHER_ID, SCHOOL_ID, baseData)
        ).rejects.toThrow(/time slot not found/i);
    });

    it("throws NotFoundError when teacher has no scheduled class at that slot", async () => {
        TimetableEntry.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue(null),
            populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
        });

        await expect(
            createProxyRequest(TEACHER_ID, SCHOOL_ID, baseData)
        ).rejects.toThrow(/no class scheduled/i);
    });
});
