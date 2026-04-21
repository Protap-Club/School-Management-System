import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../src/module/assignment/Assignment.model.js", () => ({
    Assignment: {
        insertMany: vi.fn(),
        countDocuments: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
        updateMany: vi.fn(),
    },
}));

vi.mock("../../src/module/assignment/Submission.model.js", () => ({
    Submission: {
        countDocuments: vi.fn(),
        aggregate: vi.fn().mockResolvedValue([]),
        find: vi.fn(),
    },
}));

vi.mock("../../src/module/user/model/StudentProfile.model.js", () => ({
    default: { findOne: vi.fn() },
}));

vi.mock("../../src/module/user/model/TeacherProfile.model.js", () => ({
    default: { find: vi.fn() },
}));

vi.mock("../../src/module/timetable/Timetable.model.js", () => ({
    Timetable: {},
    TimetableEntry: {},
}));

vi.mock("../../src/utils/classSection.util.js", () => ({
    assertClassSectionExists: vi.fn(),
    assertClassSectionListExists: vi.fn(),
    buildClassSectionKey: vi.fn((s, sec) => `${s}-${sec}`),
    getConfiguredClassSections: vi.fn(),
    normalizeClassSection: vi.fn((d) => d),
}));

vi.mock("../../src/middlewares/upload.middleware.js", () => ({
    deleteFromCloudinary: vi.fn(),
}));

vi.mock("../../src/config/logger.js", () => ({
    default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock User model used inside getActiveTeacherIds
vi.mock("../../src/module/user/model/User.model.js", () => ({
    default: { find: vi.fn() },
}));

import { createAssignment } from "../../src/module/assignment/assignment.service.js";
import { Assignment } from "../../src/module/assignment/Assignment.model.js";
import TeacherProfile from "../../src/module/user/model/TeacherProfile.model.js";
import User from "../../src/module/user/model/User.model.js";
import { assertClassSectionExists } from "../../src/utils/classSection.util.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const SCHOOL_ID = "605c72e2cf1f40001dbfa1a1";
const USER_ID = "605c72e2cf1f40001dbfa1a2";

const FUTURE_DATE = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
})();

const baseBody = {
    title: "Math Homework",
    subject: "Mathematics",
    standard: "10",
    section: "A",
    dueDate: FUTURE_DATE,
};

describe("createAssignment", () => {
    beforeEach(() => {
        // Class-section exists
        assertClassSectionExists.mockResolvedValue({ standard: "10", section: "A" });

        // One teacher mapped to this class + subject
        TeacherProfile.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{ userId: "teacher-1" }]),
            }),
        });

        // Mock User find resolving active teachers
        User.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([{ _id: "teacher-1" }]),
            }),
        });

        Assignment.insertMany.mockResolvedValue([
            { _id: "assignment-1", toObject: () => ({ _id: "assignment-1", title: "Math Homework" }) },
        ]);
    });

    it("creates an assignment successfully when class and teacher are valid", async () => {
        const result = await createAssignment(SCHOOL_ID, USER_ID, baseBody, []);

        expect(Assignment.insertMany).toHaveBeenCalledOnce();
        expect(result.createdCount).toBe(1);
        expect(result.assignments[0].title).toBe("Math Homework");
    });

    it("throws BadRequestError when subject is missing", async () => {
        await expect(
            createAssignment(SCHOOL_ID, USER_ID, { ...baseBody, subject: "" }, [])
        ).rejects.toThrow(/subject is required/i);
    });

    it("throws BadRequestError when standard is missing", async () => {
        await expect(
            createAssignment(SCHOOL_ID, USER_ID, { ...baseBody, standard: "" }, [])
        ).rejects.toThrow(/standard/i);
    });

    it("throws BadRequestError when due date is in the past", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2);
        const pastISO = pastDate.toISOString().split("T")[0];

        await expect(
            createAssignment(SCHOOL_ID, USER_ID, { ...baseBody, dueDate: pastISO }, [])
        ).rejects.toThrow(/future/i);
    });

    it("throws BadRequestError when no teacher is mapped to the class-subject", async () => {
        // Return empty — no teacher profile found
        TeacherProfile.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([]),
            }),
        });

        await expect(
            createAssignment(SCHOOL_ID, USER_ID, baseBody, [])
        ).rejects.toThrow(/no responsible teacher/i);
    });

    it("throws BadRequestError when multiple teachers are mapped and none is specified", async () => {
        // Two teachers mapped — ambiguous, needs explicit selection
        TeacherProfile.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([
                    { userId: "teacher-1" },
                    { userId: "teacher-2" },
                ]),
            }),
        });

        await expect(
            createAssignment(SCHOOL_ID, USER_ID, baseBody, [])
        ).rejects.toThrow(/multiple teachers/i);
    });

    it("maps file attachments correctly when files are provided", async () => {
        const mockFiles = [
            { originalname: "hw.pdf", path: "https://cdn.example.com/hw.pdf", filename: "hw-123", mimetype: "application/pdf" },
        ];

        await createAssignment(SCHOOL_ID, USER_ID, baseBody, mockFiles);

        const [payloads] = Assignment.insertMany.mock.calls[0];
        expect(payloads[0].attachments[0].fileType).toBe("pdf");
        expect(payloads[0].attachments[0].name).toBe("hw.pdf");
    });
});
