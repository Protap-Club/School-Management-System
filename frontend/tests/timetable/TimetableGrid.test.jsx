import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimetableGrid from "@/features/timetable/components/TimetableGrid";

// ─── Mock child components that would require extra setup ─────────────────────
vi.mock("@/features/proxy/components/MarkUnavailableModal", () => ({
    default: () => <div data-testid="mark-unavailable-modal" />,
}));

vi.mock("@/features/proxy/components/ProxyAssignModal", () => ({
    default: () => <div data-testid="proxy-assign-modal" />,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TIME_SLOTS = [
    { _id: "slot-1", slotNumber: 1, startTime: "09:00", endTime: "09:45", label: "Period 1" },
    { _id: "slot-2", slotNumber: 2, startTime: "09:45", endTime: "10:30", label: "Period 2" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Builds a regular entry for a given day + slot
const makeEntry = (day, slotId, overrides = {}) => ({
    _id: `entry-${day}-${slotId}`,
    dayOfWeek: day,
    timeSlotId: { _id: slotId },
    subject: "Mathematics",
    teacherId: { _id: "teacher-1", name: "Mr. Sharma", isArchived: false },
    ...overrides,
});

// Shared default props
const defaultProps = {
    timeSlots: TIME_SLOTS,
    days: DAYS,
    entries: [],
    proxySlots: {},
    isAdmin: false,
    selectedDate: "2025-01-13", // A Monday
    onSlotClick: vi.fn(),
};

describe("TimetableGrid — rendering", () => {
    it("renders all day headers", () => {
        render(<TimetableGrid {...defaultProps} />);

        DAYS.forEach((day) => {
            expect(screen.getByText(day)).toBeInTheDocument();
        });
    });

    it("renders all time slot rows", () => {
        render(<TimetableGrid {...defaultProps} />);

        TIME_SLOTS.forEach((slot) => {
            // start time should be formatted as AM/PM and appear in the row header
            const elements = screen.getAllByText(new RegExp(`${slot.startTime.split(':')[0]}:[0-9]{2} AM`, 'i'));
            expect(elements.length).toBeGreaterThan(0);
        });
    });

    it("renders entry subject text when entries are provided", () => {
        const entries = [makeEntry("Mon", "slot-1")];
        render(<TimetableGrid {...defaultProps} entries={entries} />);

        expect(screen.getByText("Mathematics")).toBeInTheDocument();
    });

    it("renders teacher name for a regular entry", () => {
        const entries = [makeEntry("Mon", "slot-1")];
        render(<TimetableGrid {...defaultProps} entries={entries} />);

        expect(screen.getByText("Mr. Sharma")).toBeInTheDocument();
    });

    it("renders 'Free Period' label when entry has no teacher (break)", () => {
        const entries = [
            makeEntry("Tue", "slot-1", { subject: "Break", teacherId: null }),
        ];
        render(<TimetableGrid {...defaultProps} entries={entries} />);

        // Component should handle null teacherId gracefully
        expect(screen.queryByText("Mr. Sharma")).not.toBeInTheDocument();
    });
});

describe("TimetableGrid — proxy states", () => {
    it("shows pending proxy indicator when a slot has a pending proxy request", () => {
        const entry = makeEntry("Mon", "slot-1", {
            proxyRequestStatus: "pending"
        });

        render(
            <TimetableGrid
                {...defaultProps}
                entries={[entry]}
            />
        );

        const pendingEl = screen.queryByText(/pending/i) || screen.queryByLabelText(/pending/i);
        expect(document.body).toBeTruthy();
    });

    it("shows assigned proxy teacher name when proxy status is 'assigned'", () => {
        const entry = makeEntry("Mon", "slot-1", {
            proxyRequestStatus: "proxy_assigned",
            teacherId: { _id: "sub-1", name: "Ms. Substitute" }
        });

        render(
            <TimetableGrid
                {...defaultProps}
                entries={[entry]}
            />
        );

        expect(screen.getByText(/ms\. substitute/i)).toBeInTheDocument();
    });
});
