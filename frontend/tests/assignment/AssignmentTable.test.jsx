import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AssignmentTable } from "@/features/assignment/components/AssignmentTable";

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days
const pastDate   = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // -2 days

const makeAssignment = (overrides = {}) => ({
    _id: `asgn-${Math.random().toString(36).slice(2)}`,
    title: "Sample Assignment",
    description: "A test description",
    subject: "Physics",
    standard: "10",
    section: "A",
    status: "active",
    dueDate: futureDate,
    assignedTeacher: { _id: "t-1", name: "Dr. Kumar" },
    attachmentsCount: 2,
    submissionCount: 5,
    ...overrides,
});

// Shared no-op callbacks
const noop = vi.fn();

const defaultProps = {
    assignments: [],
    loading: false,
    onViewClick: noop,
    onEditClick: noop,
    onDeleteClick: noop,
    currentPage: 0,
    totalItems: 0,
    pageSize: 25,
    onPageChange: noop,
    onPageSizeChange: noop,
    onSortClick: noop,
    showSortMenu: false,
    sortMenuRef: { current: null },
    sortBy: "default",
    onSortChange: noop,
    sortOptions: [
        { key: "dueDate", label: "Due Date" },
        { key: "title",   label: "Title"    },
    ],
};

describe("AssignmentTable — empty & loading states", () => {
    it("shows a loading spinner when loading is true", () => {
        render(<AssignmentTable {...defaultProps} loading={true} />);
        expect(screen.getByText(/loading assignments/i)).toBeInTheDocument();
    });

    it("shows an empty state message when assignments is empty", () => {
        render(<AssignmentTable {...defaultProps} />);
        expect(screen.getByText(/no assignments found/i)).toBeInTheDocument();
    });
});

describe("AssignmentTable — data rendering", () => {
    it("renders assignment title", () => {
        const a = makeAssignment({ title: "Algebra Worksheet" });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText("Algebra Worksheet")).toBeInTheDocument();
    });

    it("renders subject and teacher name", () => {
        const a = makeAssignment({ subject: "Physics", assignedTeacher: { name: "Dr. Kumar" } });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText("Physics")).toBeInTheDocument();
        expect(screen.getByText("Dr. Kumar")).toBeInTheDocument();
    });

    it("renders class-section badge correctly", () => {
        const a = makeAssignment({ standard: "10", section: "B" });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText("10-B")).toBeInTheDocument();
    });

    it("shows 'active' status badge for an active assignment", () => {
        const a = makeAssignment({ status: "active" });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("shows 'inactive' status badge for an inactive assignment", () => {
        const a = makeAssignment({ status: "inactive", dueDate: pastDate });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText("inactive")).toBeInTheDocument();
    });
});

describe("AssignmentTable — overdue indicator", () => {
    it("shows a 'Late' badge when an active assignment is past its due date", () => {
        const a = makeAssignment({ status: "active", dueDate: pastDate });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.getByText(/late/i)).toBeInTheDocument();
    });

    it("does NOT show 'Late' badge for future due dates", () => {
        const a = makeAssignment({ status: "active", dueDate: futureDate });
        render(<AssignmentTable {...defaultProps} assignments={[a]} />);
        expect(screen.queryByText(/late/i)).not.toBeInTheDocument();
    });
});

describe("AssignmentTable — action callbacks", () => {
    it("calls onViewClick when the view button is clicked", () => {
        const onViewClick = vi.fn();
        const a = makeAssignment();
        render(<AssignmentTable {...defaultProps} assignments={[a]} onViewClick={onViewClick} />);

        const viewBtn = screen.getByTitle("View Details");
        fireEvent.click(viewBtn);

        expect(onViewClick).toHaveBeenCalledWith(a);
    });

    it("calls onEditClick when the edit button is clicked", () => {
        const onEditClick = vi.fn();
        const a = makeAssignment();
        render(<AssignmentTable {...defaultProps} assignments={[a]} onEditClick={onEditClick} />);

        const editBtn = screen.getByTitle("Edit Assignment");
        fireEvent.click(editBtn);

        expect(onEditClick).toHaveBeenCalledWith(a);
    });

    it("calls onDeleteClick when the delete button is clicked", () => {
        const onDeleteClick = vi.fn();
        const a = makeAssignment();
        render(<AssignmentTable {...defaultProps} assignments={[a]} onDeleteClick={onDeleteClick} />);

        const deleteBtn = screen.getByTitle("Delete Assignment");
        fireEvent.click(deleteBtn);

        expect(onDeleteClick).toHaveBeenCalledWith(a);
    });
});
