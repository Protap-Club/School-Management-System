import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TimetableGrid from "@/features/timetable/components/TimetableGrid";

const baseSlot = {
    _id: "slot-1",
    slotNumber: 1,
    startTime: "08:00",
    endTime: "09:00",
    slotType: "CLASS",
};

const mondayDate = new Date("2026-04-13T00:00:00.000Z");
const weekDates = {
    Mon: mondayDate,
    Tue: new Date("2026-04-14T00:00:00.000Z"),
    Wed: new Date("2026-04-15T00:00:00.000Z"),
    Thu: new Date("2026-04-16T00:00:00.000Z"),
    Fri: new Date("2026-04-17T00:00:00.000Z"),
    Sat: new Date("2026-04-18T00:00:00.000Z"),
};

const formatDateShort = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

describe("TimetableGrid", () => {
    it("renders regular entries and empty cells without proxy badges", () => {
        render(
            <TimetableGrid
                entries={[
                    {
                        dayOfWeek: "Mon",
                        timeSlotId: "slot-1",
                        subject: "Regular Math",
                        teacherId: { name: "Teacher Regular" },
                    },
                ]}
                timeSlots={[baseSlot]}
                weekDates={weekDates}
                formatDateShort={formatDateShort}
            />
        );

        expect(screen.getByText("Regular Math")).toBeInTheDocument();
        expect(screen.getByText("Teacher Regular")).toBeInTheDocument();
        expect(screen.queryByText("PROXY DUTY")).not.toBeInTheDocument();
    });

    it("renders proxy state labels and free-period text correctly", () => {
        render(
            <TimetableGrid
                entries={[
                    {
                        dayOfWeek: "Mon",
                        timeSlotId: "slot-1",
                        subject: "Proxy Duty Subject",
                        isProxy: true,
                        originalTeacherId: { name: "Original Teacher" },
                        teacherId: { name: "Proxy Teacher" },
                    },
                    {
                        dayOfWeek: "Tue",
                        timeSlotId: "slot-1",
                        subject: "Pending Subject",
                        proxyRequestStatus: "pending",
                        teacherId: { name: "Teacher Pending" },
                    },
                    {
                        dayOfWeek: "Wed",
                        timeSlotId: "slot-1",
                        subject: "Assigned Subject",
                        proxyRequestStatus: "proxy_assigned",
                        teacherId: { name: "Teacher Assigned" },
                    },
                    {
                        dayOfWeek: "Thu",
                        timeSlotId: "slot-1",
                        subject: "Free Period Subject",
                        proxyRequestStatus: "free_period",
                        originalTeacherId: { name: "Teacher Unavailable" },
                    },
                ]}
                timeSlots={[baseSlot]}
                weekDates={weekDates}
                formatDateShort={formatDateShort}
            />
        );

        expect(screen.getByText("PROXY DUTY")).toBeInTheDocument();
        expect(screen.getByText("PROXY REQUESTED")).toBeInTheDocument();
        expect(screen.getByText("PROXY ASSIGNED")).toBeInTheDocument();
        expect(screen.getByText("PROXY FREE PERIOD")).toBeInTheDocument();
        expect(screen.getByText("Awaiting admin decision")).toBeInTheDocument();
        expect(screen.getByText("Free Period")).toBeInTheDocument();
        expect(screen.getByText("Teacher Unavailable unavailable")).toBeInTheDocument();
    });

    it("triggers mark-unavailable for regular entries but skips proxy duty entries in teacher view", () => {
        const onMarkUnavailable = vi.fn();
        const regularEntry = {
            dayOfWeek: "Mon",
            timeSlotId: "slot-1",
            subject: "Regular Subject",
            teacherId: { name: "Teacher A" },
        };
        const proxyEntry = {
            dayOfWeek: "Tue",
            timeSlotId: "slot-1",
            subject: "Proxy Subject",
            isProxy: true,
            teacherId: { name: "Teacher B" },
        };

        render(
            <TimetableGrid
                entries={[regularEntry, proxyEntry]}
                timeSlots={[baseSlot]}
                weekDates={weekDates}
                formatDateShort={formatDateShort}
                isTeacherView
                onMarkUnavailable={onMarkUnavailable}
            />
        );

        fireEvent.click(screen.getByText("Regular Subject"));
        expect(onMarkUnavailable).toHaveBeenCalledTimes(1);
        expect(onMarkUnavailable).toHaveBeenCalledWith("Mon", baseSlot, regularEntry);

        fireEvent.click(screen.getByText("Proxy Subject"));
        expect(onMarkUnavailable).toHaveBeenCalledTimes(1);
    });
});
