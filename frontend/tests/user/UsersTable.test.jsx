import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersTable } from "@/features/users/components/UsersTable";

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
    teacher: {
        avatarClass: "bg-blue-100 text-blue-700",
        badgeClass:  "bg-blue-50 text-blue-700 border-blue-200",
    },
    student: {
        avatarClass: "bg-emerald-100 text-emerald-700",
        badgeClass:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    admin: {
        avatarClass: "bg-purple-100 text-purple-700",
        badgeClass:  "bg-purple-50 text-purple-700 border-purple-200",
    },
};

const makeUser = (overrides = {}) => ({
    _id: `user-${Math.random().toString(36).slice(2)}`,
    name: "John Doe",
    email: "john@school.edu",
    role: "teacher",
    isActive: true,
    ...overrides,
});

// Shared no-op callbacks
const noop = vi.fn();

const defaultProps = {
    users: [],
    loading: false,
    showArchived: false,
    selectionMode: false,
    selectedUsers: [],
    onToggleSelectAll: noop,
    onToggleUserSelection: noop,
    onSortClick: noop,
    showSortMenu: false,
    sortMenuRef: { current: null },
    sortBy: "default",
    onSortChange: noop,
    sortOptions: [{ key: "name", label: "Name" }],
    allowedRoles: ["teacher", "student"],
    isAdminOrAbove: true,
    onRowClick: noop,
    onEditClick: noop,
    onArchiveClick: noop,
    roleLabels: ROLE_LABELS,
    currentPage: 0,
    totalItems: 0,
    pageSize: 25,
    onPageChange: noop,
    onPageSizeChange: noop,
};

describe("UsersTable — empty & loading states", () => {
    it("shows a loading spinner when loading is true", () => {
        render(<UsersTable {...defaultProps} loading={true} />);
        expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    });

    it("shows 'No users found' when users array is empty (active view)", () => {
        render(<UsersTable {...defaultProps} />);
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
        expect(screen.getByText(/add your first user to get started/i)).toBeInTheDocument();
    });

    it("shows 'No archived users' hint when showArchived is true", () => {
        render(<UsersTable {...defaultProps} showArchived={true} />);
        expect(screen.getByText(/no archived users/i)).toBeInTheDocument();
    });
});

describe("UsersTable — data rendering", () => {
    it("renders user name and role badge", () => {
        const user = makeUser({ name: "Ms. Patel", role: "teacher" });
        render(<UsersTable {...defaultProps} users={[user]} />);

        expect(screen.getByText("Ms. Patel")).toBeInTheDocument();
        expect(screen.getByText("teacher")).toBeInTheDocument();
    });

    it("renders user email", () => {
        const user = makeUser({ email: "ms.patel@school.edu" });
        render(<UsersTable {...defaultProps} users={[user]} />);
        const elements = screen.getAllByText("ms.patel@school.edu");
        expect(elements.length).toBeGreaterThan(0);
    });

    it("renders 'Active' status for an active user", () => {
        const user = makeUser({ isActive: true });
        render(<UsersTable {...defaultProps} users={[user]} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders 'Inactive' status for an inactive user", () => {
        const user = makeUser({ isActive: false });
        render(<UsersTable {...defaultProps} users={[user]} />);
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders multiple users correctly", () => {
        const users = [
            makeUser({ name: "Alice", role: "teacher" }),
            makeUser({ name: "Bob",   role: "student" }),
        ];
        render(<UsersTable {...defaultProps} users={users} />);

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });
});

describe("UsersTable — action callbacks", () => {
    beforeEach(() => { noop.mockReset(); });

    it("calls onRowClick when a user row is clicked", () => {
        const onRowClick = vi.fn();
        const user = makeUser({ name: "Alice" });
        render(<UsersTable {...defaultProps} users={[user]} onRowClick={onRowClick} />);

        fireEvent.click(screen.getByTitle("View Details"));
        expect(onRowClick).toHaveBeenCalledWith(user);
    });

    it("calls onEditClick when edit button is clicked", () => {
        const onEditClick = vi.fn();
        const user = makeUser();
        render(<UsersTable {...defaultProps} users={[user]} onEditClick={onEditClick} />);

        fireEvent.click(screen.getByTitle("Edit User"));
        expect(onEditClick).toHaveBeenCalledWith(user);
    });

    it("calls onArchiveClick when archive button is clicked (admin mode)", () => {
        const onArchiveClick = vi.fn();
        const user = makeUser();
        render(
            <UsersTable
                {...defaultProps}
                users={[user]}
                isAdminOrAbove={true}
                onArchiveClick={onArchiveClick}
            />
        );

        fireEvent.click(screen.getByTitle("Archive User"));
        expect(onArchiveClick).toHaveBeenCalledWith(user);
    });

    it("does NOT show archive button when isAdminOrAbove is false", () => {
        const user = makeUser();
        render(
            <UsersTable
                {...defaultProps}
                users={[user]}
                isAdminOrAbove={false}
            />
        );

        expect(screen.queryByTitle("Archive User")).not.toBeInTheDocument();
    });
});

describe("UsersTable — selection mode", () => {
    it("shows checkboxes in selection mode", () => {
        const user = makeUser();
        render(
            <UsersTable
                {...defaultProps}
                users={[user]}
                selectionMode={true}
                selectedUsers={[]}
            />
        );

        const checkboxes = screen.getAllByRole("checkbox");
        // Header checkbox + one row checkbox
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    });

    it("marks row checkbox as checked when user is selected", () => {
        const user = makeUser({ _id: "u-1" });
        render(
            <UsersTable
                {...defaultProps}
                users={[user]}
                selectionMode={true}
                selectedUsers={["u-1"]}
            />
        );

        const rowCheckbox = screen.getAllByRole("checkbox")[1]; // index 0 = header
        expect(rowCheckbox).toBeChecked();
    });
});
