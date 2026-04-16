import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarkUnavailableModal from "@/features/proxy/components/MarkUnavailableModal";

// ─── Mock the proxy mutation hook ─────────────────────────────────────────────
const mockMutate = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockCreateProxyRequest = {
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
};

vi.mock("@/features/proxy/api/queries", () => ({
    useCreateProxyRequest: () => mockCreateProxyRequest,
}));

// ─── Helper: wrap with QueryClientProvider ─────────────────────────────────────
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const slotInfo = {
    dayOfWeek: "Mon",
    timeSlot: { _id: "slot-1", slotNumber: 1, startTime: "09:00", endTime: "09:45" },
    date: new Date("2025-01-13T12:00:00Z"), // 2025-01-13 is a Monday
    subject: "Mathematics",
    standard: "10",
    section: "A",
};

const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    slotInfo,
};

const Wrapper = createWrapper();

describe("MarkUnavailableModal — visibility", () => {
    it("renders the modal when isOpen is true", () => {
        render(<MarkUnavailableModal {...defaultProps} />, { wrapper: Wrapper });

        // Modal should have some heading or title
        expect(screen.getByRole("dialog") || document.body).toBeTruthy();
    });

    it("does not render content when isOpen is false", () => {
        render(<MarkUnavailableModal {...defaultProps} isOpen={false} />, { wrapper: Wrapper });

        // No dialog should be present, or content should be hidden
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});

describe("MarkUnavailableModal — slot info display", () => {
    beforeEach(() => {
        mockMutate.mockReset();
        mockMutateAsync.mockReset();
        mockMutateAsync.mockResolvedValue({});
    });

    it("displays the date from slotInfo", () => {
        render(<MarkUnavailableModal {...defaultProps} />, { wrapper: Wrapper });

        expect(screen.getByText(/2025/i)).toBeInTheDocument();
    });

    it("displays the subject and class from slotInfo", () => {
        render(<MarkUnavailableModal {...defaultProps} />, { wrapper: Wrapper });

        expect(screen.getByText(/10-A • Mathematics/i)).toBeInTheDocument();
    });

    it("displays the time slot from slotInfo", () => {
        render(<MarkUnavailableModal {...defaultProps} />, { wrapper: Wrapper });

        expect(screen.getByText(/09:00 - 09:45/i)).toBeInTheDocument();
    });
});

describe("MarkUnavailableModal — form interaction", () => {
    beforeEach(() => {
        mockMutate.mockReset();
        mockMutateAsync.mockReset();
        mockMutateAsync.mockResolvedValue({});
    });

    it("calls onClose when the cancel button is clicked", () => {
        const onClose = vi.fn();
        render(<MarkUnavailableModal {...defaultProps} onClose={onClose} />, { wrapper: Wrapper });

        const cancelBtn = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelBtn);

        expect(onClose).toHaveBeenCalled();
    });

    it("does not submit and shows error if date mismatches dayOfWeek", async () => {
        const badSlotInfo = {
            ...slotInfo,
            date: new Date("2025-01-14T12:00:00Z") // Tue, but dayOfWeek is Mon
        };
        const onError = vi.fn();
        render(<MarkUnavailableModal {...defaultProps} slotInfo={badSlotInfo} onError={onError} />, { wrapper: Wrapper });

        const submitBtn = screen.getByRole("button", { name: /mark unavailable/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockMutateAsync).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledWith(expect.stringContaining("Selected date is Tue"));
        });
    });

    it("calls mutate with correct payload after submitting", async () => {
        render(<MarkUnavailableModal {...defaultProps} />, { wrapper: Wrapper });

        const submitBtn = screen.getByRole("button", { name: /mark unavailable/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    date: "2025-01-13",
                    timeSlotId: "slot-1",
                    dayOfWeek: "Mon",
                })
            );
        });
    });
});
