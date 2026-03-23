# Frontend Audit — Phase-wise Implementation Plan

> **Source:** [frontend_code_audit_2026_03_23.md](file:///D:/Protap/SMS/School-Management-System/frontend_code_audit_2026_03_23.md)
> **Constraint:** Zero functional or visual changes. Pure structural cleanup only.
> **Root:** `D:\Protap\SMS\School-Management-System\frontend\src` (referred to as `src/` below)

---

## Overview

| Phase | Description | Parallelizable | Audit Issues Covered |
|-------|-------------|----------------|----------------------|
| **1** | Create all shared files & utilities | ❌ Must run first | Prereq for all |
| **2** | FeesPage — extract dupes, decompose tabs | ✅ After Phase 1 | #1, #2, #3, #6, #8, #12 |
| **3** | ResultPage + Result modals | ✅ After Phase 1 | #1, #2, #3, #5, #6, #8 |
| **4** | ExaminationPage + ExamModal | ✅ After Phase 1 | #1, #6, #8 |
| **5** | TimetablePage + TimetableModal | ✅ After Phase 1 | #5, #8 |
| **6** | Settings, Users, Dashboard, DashboardLayout | ✅ After Phase 1 | #6, #7, #8, #10, #11 |
| **7** | Calendar, Attendance, Assignment, Notifications | ✅ After Phase 1 | #4, #8, #13 |
| **8** | App.css deletion + api/axios cleanup (remaining) | ✅ After Phase 1 | #9, #11 (remaining files) |

---

## Phase 1 — Create Shared Utilities & Components (Prerequisite)

**Goal:** Create every new shared file that later phases will import. No existing file is modified.

### Files CREATED (write-only)

| New File | Audit Issue | Purpose |
|----------|-------------|---------|
| `src/components/ui/EmptyState.jsx` | #1 | Shared `<EmptyState>` component |
| `src/components/ui/StatusBadge.jsx` | #2 | Generic `<StatusBadge>` with `styles` prop |
| `src/components/ui/SkeletonRows.jsx` | #3 | Shared `<SkeletonRows rows columns>` |
| `src/components/ui/PaginationControls.jsx` | #4 | Consolidated pagination (superset API from Assignment version) |
| `src/components/ui/Spinner.jsx` | #8 | `<ButtonSpinner>` + `<PageSpinner>` |
| `src/hooks/useToastMessage.js` | #6 | `useToastMessage()` hook returning `{ message, showMessage }` |

### Files MODIFIED (append-only)

| File | Change |
|------|--------|
| [src/utils/index.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/utils/index.js) | Append `readError()` (Issue #5) and `getRelativeTime()` (Issue #13) |

---

### Step 1.1 — Create `src/components/ui/EmptyState.jsx`

```jsx
import React from 'react';

export const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="text-center py-12 text-gray-400">
    {Icon && <Icon className="mx-auto text-3xl mb-2 opacity-50" />}
    <div className="font-semibold text-gray-500">{title}</div>
    {subtitle && <div className="text-xs mt-1">{subtitle}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
```

> [!IMPORTANT]
> Before writing this file, view the three existing definitions at:
> - [src/features/fees/FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) lines 48-57
> - [src/features/result/ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) lines 92-101
> - [src/features/examination/ExaminationPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/examination/ExaminationPage.jsx) lines 38-49
>
> Produce a **superset** component that renders identically for all three call sites. Copy the exact Tailwind classes from the original with the broadest set. If classes differ between files, use the majority pattern and verify pixel parity.

---

### Step 1.2 — Create `src/components/ui/StatusBadge.jsx`

```jsx
const DEFAULT_STYLE = 'bg-gray-100 text-gray-600';

export const StatusBadge = ({ status, styles }) => {
  const s = styles[status] || DEFAULT_STYLE;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s}`}>
      {status}
    </span>
  );
};
```

> Before writing: view [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) lines 31-38 and [ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) lines 59-88 to capture the exact styling classes for each status value. These become the `FEE_STATUS_STYLES` and `RESULT_STATUS_STYLES` constants that consumers define locally.

---

### Step 1.3 — Create `src/components/ui/SkeletonRows.jsx`

```jsx
export const SkeletonRows = ({ rows = 5, columns = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: columns }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
```

> Before writing: view [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) lines 40-46 and [ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) lines 103-115 to match exact `<td>` padding, `h-4`/`w-*` classes, and `animate-pulse` pattern.

---

### Step 1.4 — Create `src/components/ui/PaginationControls.jsx`

Copy [src/features/assignment/components/AssignmentPaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/components/AssignmentPaginationControls.jsx) (89 lines) **verbatim** into the new file. Change only:
1. The export name from `AssignmentPaginationControls` → `PaginationControls`.
2. Make `onPageSizeChange` and `pageSize` optional with sensible defaults so the Attendance usage (which doesn't pass them) still works.

> [!IMPORTANT]
> The new component **must** accept both `itemsPerPage` (Attendance's prop name) and `pageSize` (Assignment's prop name). Use: `const size = pageSize || itemsPerPage || 10;`

---

### Step 1.5 — Create `src/components/ui/Spinner.jsx`

```jsx
// Small inline button spinner (white-on-colored-bg)
export const ButtonSpinner = () => (
  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

// Page-level loading spinner (configurable size)
export const PageSpinner = ({ size = 'h-8 w-8' }) => (
  <div className={`animate-spin rounded-full ${size} border-2 border-gray-200 border-t-gray-600`} />
);
```

> Before writing: grep all spinner patterns across the codebase (`animate-spin.*border.*rounded-full`) and ensure these two cover the majority. Any cosmetic differences (e.g., `border-gray-200` vs `border-gray-100`) must match the most common variant exactly.

---

### Step 1.6 — Create `src/hooks/useToastMessage.js`

```js
import { useState, useRef, useCallback, useEffect } from 'react';

export const useToastMessage = (duration = 4000) => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showMessage = useCallback((type, text) => {
    clearTimeout(timerRef.current);
    setMessage({ type, text });
    timerRef.current = setTimeout(() => setMessage(null), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { message, showMessage };
};
```

> Before writing: view the `showMessage` implementations in all 5 files (Settings.jsx, UsersPage.jsx, ResultPage.jsx, ExaminationPage.jsx, CalendarPage.jsx) to confirm the pattern is identical. If any file uses a different duration or extra behavior, expose it as a parameter.

---

### Step 1.7 — Append to [src/utils/index.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/utils/index.js)

Add at the end of the file (after line 43):

```js
// Extract error message from Axios error objects (Issue #5)
export const readError = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

// Human-readable relative time string (Issue #13)
export const getRelativeTime = (dateString) => {
  // Copy the EXACT body from src/pages/Notifications.jsx lines 12-28
};
```

> [!IMPORTANT]
> Copy the `getRelativeTime` body **exactly** from [Notifications.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Notifications.jsx) lines 12-28. Do not rewrite.
> Copy the `readError` body from [ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) line 56-57 or [TimetablePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/TimetablePage.jsx) line 27-33 (they're identical).

---

### Phase 1 — Self-Verification Checklist

- [ ] All 6 new files exist under `src/components/ui/` and `src/hooks/`
- [ ] [src/utils/index.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/utils/index.js) has `readError` and `getRelativeTime` appended
- [ ] No existing file was modified (except [utils/index.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/utils/index.js) append)
- [ ] All new files have valid JSX/JS syntax (run `npx eslint` on each)
- [ ] Imports within new files resolve (e.g., `react`, `useCallback`)
- [ ] Dev server still compiles without errors (`npm run dev` shows no new warnings)

---

## Phase 2 — FeesPage Cleanup & Decomposition

**Audit Issues:** #1, #2, #3, #6, #8, #12

### Files READ

| File | Purpose |
|------|---------|
| [src/features/fees/FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) | Primary target (1,848 lines) |

### Files WRITTEN

| File | Action |
|------|--------|
| [src/features/fees/FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) | Remove inline dupes, replace with imports, extract tab components |
| `src/features/fees/components/FeeStructuresTab.jsx` | **[NEW]** Extracted from FeesPage |
| `src/features/fees/components/StaffSalaryTab.jsx` | **[NEW]** Extracted from FeesPage |
| `src/features/fees/components/StudentFeeHistoryTab.jsx` | **[NEW]** Extracted from FeesPage |
| `src/features/fees/components/YearlySummaryTab.jsx` | **[NEW]** Extracted from FeesPage |
| `src/features/fees/components/FeeMonthlyOverviewTab.jsx` | **[NEW]** Extracted from FeesPage |

> [!NOTE]
> All `src/components/fees/*` modal files (FeeStructureForm, FeeStructureModal, FeeTypeSideCard, GenerateAssignmentsModal, PaymentModal, SalaryForm) are **NOT touched** in this phase.

### Step 2.1 — Remove inline `EmptyState` (Issue #1)

1. Delete the `EmptyState` component definition at ~lines 48-57.
2. Add import: `import { EmptyState } from '../../components/ui/EmptyState';`
3. All existing `<EmptyState ... />` JSX call sites remain unchanged.

### Step 2.2 — Remove inline `StatusBadge` (Issue #2)

1. Delete the `StatusBadge` / status-color-map definition at ~lines 31-38.
2. Add import: `import { StatusBadge } from '../../components/ui/StatusBadge';`
3. Define locally: `const FEE_STATUS_STYLES = { paid: '...', pending: '...', overdue: '...' };` (copy exact classes from deleted code).
4. Update JSX: `<StatusBadge status={fee.status} styles={FEE_STATUS_STYLES} />`

### Step 2.3 — Remove inline `SkeletonRow` (Issue #3)

1. Delete the `SkeletonRow` component definition at ~lines 40-46.
2. Add import: `import { SkeletonRows } from '../../components/ui/SkeletonRows';`
3. Replace every `Array.from({ length: N }).map((_, i) => <SkeletonRow key={i} cols={C} />)` with `<SkeletonRows rows={N} columns={C} />`.

### Step 2.4 — Replace `showToast` with `useToastMessage` (Issue #6)

1. Delete inline `showToast` state, ref, and function.
2. Add import: `import { useToastMessage } from '../../hooks/useToastMessage';`
3. Add `const { message, showMessage } = useToastMessage();` at the top of the component.
4. Replace `showToast(...)` calls with `showMessage(...)`.
5. Replace the inline toast rendering `<div>` with the same JSX but reading from `message.type` and `message.text`.

### Step 2.5 — Replace inline spinners (Issue #8)

1. Add import: `import { ButtonSpinner, PageSpinner } from '../../components/ui/Spinner';`
2. Find all occurrences of `<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />` (and similar) and replace with `<ButtonSpinner />`.
3. Find page-level spinner divs and replace with `<PageSpinner />` or `<PageSpinner size="h-12 w-12" />`.

### Step 2.6 — Decompose into tab components (Issue #12)

For each tab component:
1. Identify the JSX block rendered when that tab is active.
2. Move it to a new file under `src/features/fees/components/`.
3. The new component receives all needed data and callbacks **as props** — no logic changes, no state lifting.
4. In [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx), replace the inline JSX block with `<FeeStructuresTab ... />` etc.
5. [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) becomes the orchestrator: tab nav, shared state/hooks, renders selected tab.

**Tab extraction map:**

| Tab | Extract To | Approximate FeesPage Line Range |
|-----|-----------|-------------------------------|
| Fee Structures | `FeeStructuresTab.jsx` | Identify by `activeTab === 'structures'` |
| Staff Salary | `StaffSalaryTab.jsx` | Identify by `activeTab === 'salary'` |
| Student Fee History | `StudentFeeHistoryTab.jsx` | Identify by `activeTab === 'history'` |
| Yearly Summary | `YearlySummaryTab.jsx` | Identify by `activeTab === 'yearly'` |
| Monthly Overview | `FeeMonthlyOverviewTab.jsx` | Identify by `activeTab === 'monthly'` |

> [!IMPORTANT]
> Each extracted component must render **pixel-identical** output. Pass ALL state variables and handler functions from FeesPage as props. Do NOT reorganize any state.

### Phase 2 — Self-Verification Checklist

- [ ] [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) no longer contains local definitions of `EmptyState`, `StatusBadge`, `SkeletonRow`, `showToast`/`showMessage`, or inline spinner divs
- [ ] All 5 new tab component files exist under `src/features/fees/components/`
- [ ] [FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) imports from `components/ui/EmptyState`, `components/ui/StatusBadge`, `components/ui/SkeletonRows`, `components/ui/Spinner`, `hooks/useToastMessage`
- [ ] All 5 tab components import correctly from their parent
- [ ] Dev server compiles without errors
- [ ] Navigate to the Fees page → each tab renders identically to before
- [ ] No new console errors or warnings

---

## Phase 3 — ResultPage + Result Modals

**Audit Issues:** #1, #2, #3, #5, #6, #8

### Files WRITTEN

| File | Action |
|------|--------|
| [src/features/result/ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) | Remove inline dupes, replace with imports |
| [src/features/result/components/ResultDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultDetailModal.jsx) | Replace inline spinners |
| [src/features/result/components/ResultEntryModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultEntryModal.jsx) | Replace inline spinners |

### Step 3.1 — Remove inline `EmptyState` (Issue #1)

1. Delete definition at ~line 92-101.
2. Add: `import { EmptyState } from '../../components/ui/EmptyState';`

### Step 3.2 — Remove inline `StatusBadge` (Issue #2)

1. Delete definition at ~lines 59-88.
2. Add: `import { StatusBadge } from '../../components/ui/StatusBadge';`
3. Define locally: `const RESULT_STATUS_STYLES = { draft: '...', published: '...', locked: '...' };`
4. Update JSX usages.

### Step 3.3 — Remove inline `SkeletonRows` (Issue #3)

1. Delete definition at ~lines 103-115.
2. Add: `import { SkeletonRows } from '../../components/ui/SkeletonRows';`

### Step 3.4 — Remove inline `readError` (Issue #5)

1. Delete definition at ~line 56-57.
2. Add: `import { readError } from '../../utils';`

### Step 3.5 — Replace `showMessage` with `useToastMessage` (Issue #6)

1. Delete inline `message` state, `messageRef`, `showMessage` function.
2. Add: `import { useToastMessage } from '../../hooks/useToastMessage';`
3. Add: `const { message, showMessage } = useToastMessage();`
4. Keep toast rendering JSX, but bind to `message.type` / `message.text`.

### Step 3.6 — Replace inline spinners (Issue #8)

In [ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx), [ResultDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultDetailModal.jsx), and [ResultEntryModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultEntryModal.jsx):
1. Add: `import { ButtonSpinner, PageSpinner } from '../../components/ui/Spinner';` (adjust path for modals: `../../../components/ui/Spinner`)
2. Replace matching spinner divs.

### Phase 3 — Self-Verification Checklist

- [ ] [ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) no longer contains local `EmptyState`, `StatusBadge`, `SkeletonRows`, `readError`, `showMessage`
- [ ] All 3 files import from the correct shared locations
- [ ] Dev server compiles without errors
- [ ] Result page renders identically (all tabs, modals)
- [ ] No console errors

---

## Phase 4 — ExaminationPage + ExamModal

**Audit Issues:** #1, #6, #8

### Files WRITTEN

| File | Action |
|------|--------|
| [src/features/examination/ExaminationPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/examination/ExaminationPage.jsx) | Remove inline dupes |
| [src/components/examination/ExamModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/examination/ExamModal.jsx) | Replace inline spinners |

### Step 4.1 — Remove inline `EmptyState` (Issue #1)

1. Delete definition at ~lines 38-49.
2. Add: `import { EmptyState } from '../../components/ui/EmptyState';`

### Step 4.2 — Replace `showMessage` with `useToastMessage` (Issue #6)

1. Delete inline `message` state, `messageRef`, `showMessage`.
2. Add: `import { useToastMessage } from '../../hooks/useToastMessage';`
3. Add: `const { message, showMessage } = useToastMessage();`

### Step 4.3 — Replace inline spinners (Issue #8)

In both [ExaminationPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/examination/ExaminationPage.jsx) and [ExamModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/examination/ExamModal.jsx):
1. Add: `import { ButtonSpinner, PageSpinner } from '../../components/ui/Spinner';` (adjust relative path for ExamModal)
2. Replace matching spinner divs.

### Phase 4 — Self-Verification Checklist

- [ ] [ExaminationPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/examination/ExaminationPage.jsx) no longer contains local `EmptyState` or `showMessage`
- [ ] Both files import spinners from shared location
- [ ] Dev server compiles without errors
- [ ] Examination page renders identically
- [ ] ExamModal opens/closes correctly

---

## Phase 5 — TimetablePage + TimetableModal

**Audit Issues:** #5, #8

### Files WRITTEN

| File | Action |
|------|--------|
| [src/features/timetable/TimetablePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/TimetablePage.jsx) | Remove `readError`, replace spinners |
| [src/features/timetable/components/TimetableModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/components/TimetableModal.jsx) | Replace spinners |

### Step 5.1 — Remove inline `readError` (Issue #5)

1. Delete `readError` definition at ~lines 27-33.
2. Add: `import { readError } from '../../utils';`

### Step 5.2 — Replace inline spinners (Issue #8)

In [TimetablePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/TimetablePage.jsx):
- Replace `<FaSpinner className="animate-spin" />` instances with `<ButtonSpinner />` (or keep `<FaSpinner>` if they're used differently — verify visually).

In [TimetableModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/components/TimetableModal.jsx):
- Same treatment for any `<FaSpinner className="animate-spin" />`.
- Add: `import { ButtonSpinner } from '../../../components/ui/Spinner';`

### Phase 5 — Self-Verification Checklist

- [ ] [TimetablePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/TimetablePage.jsx) no longer contains a local `readError`
- [ ] Spinner imports resolve correctly
- [ ] Dev server compiles without errors
- [ ] Timetable page + modal render identically

---

## Phase 6 — Settings, Users, Dashboard, DashboardLayout

**Audit Issues:** #6, #7, #8, #10, #11

### Files WRITTEN

| File | Action |
|------|--------|
| [src/pages/Settings.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Settings.jsx) | Replace `showMessage`, spinners, update `api/axios` import |
| [src/features/users/UsersPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/UsersPage.jsx) | Replace `showMessage`, spinners |
| [src/features/users/components/UserDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/components/UserDetailModal.jsx) | Update `api/axios` import |
| [src/pages/Dashboard.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Dashboard.jsx) | Dedupe `rolePrefix`, remove dead `<style>` block |
| [src/layouts/DashboardLayout.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/layouts/DashboardLayout.jsx) | Update `api/axios` import |

### Step 6.1 — Settings.jsx (Issue #6, #8, #11)

1. Delete inline `showMessage` state/ref/function.
2. Add: `import { useToastMessage } from '../hooks/useToastMessage';`
3. Add: `const { message, showMessage } = useToastMessage();`
4. Replace inline spinner divs with `<PageSpinner />` / `<ButtonSpinner />`.
5. Change import: `import api from '../api/axios';` → `import api from '../lib/axios';`

### Step 6.2 — UsersPage.jsx (Issue #6, #8)

1. Delete inline `showMessage` state/ref/function.
2. Add: `import { useToastMessage } from '../../hooks/useToastMessage';`
3. Add: `const { message, showMessage } = useToastMessage();`
4. Replace inline spinner divs with `<ButtonSpinner />` / `<PageSpinner />`.

### Step 6.3 — UserDetailModal.jsx (Issue #11)

1. Change import: `import api from '../../../api/axios';` → `import api from '../../../lib/axios';`

### Step 6.4 — Dashboard.jsx (Issue #7, #10)

1. **Issue #7:** Find the three `rolePrefix` computations (~lines 387, 391, 546). Replace with a single `useMemo`:
```js
const rolePrefix = useMemo(() =>
  user?.role === 'super_admin' ? 'superadmin' : user?.role,
[user?.role]);
```
2. **Issue #10:** Delete the entire `<style>` block defining `.custom-scrollbar` classes (search for `custom-scrollbar` in the JSX).

### Step 6.5 — DashboardLayout.jsx (Issue #11)

1. Change import: `import api from '../api/axios';` → `import api from '../lib/axios';`

### Phase 6 — Self-Verification Checklist

- [ ] [Settings.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Settings.jsx) and [UsersPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/UsersPage.jsx) no longer contain local `showMessage`
- [ ] [Dashboard.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Dashboard.jsx) has exactly one `rolePrefix` computation and no `<style>` block for `custom-scrollbar`
- [ ] [Settings.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Settings.jsx), [DashboardLayout.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/layouts/DashboardLayout.jsx), [UserDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/components/UserDetailModal.jsx) import from `lib/axios` (not `api/axios`)
- [ ] Dev server compiles without errors
- [ ] Settings page, Users page, Dashboard all render identically
- [ ] No console errors

---

## Phase 7 — Calendar, Attendance, Assignment, Notifications

**Audit Issues:** #4, #6, #8, #13

### Files WRITTEN

| File | Action |
|------|--------|
| [src/features/calendar/CalendarPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/calendar/CalendarPage.jsx) | Replace `showMessage`, spinners |
| [src/features/attendance/components/PaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/components/PaginationControls.jsx) | **[DELETE]** |
| [src/features/attendance/AttendancePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/AttendancePage.jsx) | Update PaginationControls import, replace spinners |
| [src/features/assignment/components/AssignmentPaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/components/AssignmentPaginationControls.jsx) | **[DELETE]** |
| [src/features/assignment/AssignmentPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/AssignmentPage.jsx) | Update PaginationControls import |
| [src/pages/Notifications.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Notifications.jsx) | Remove inline `getRelativeTime`, import from utils |

### Step 7.1 — CalendarPage.jsx (Issue #6, #8)

1. Delete inline `showMessage` state/ref/function.
2. Add: `import { useToastMessage } from '../../hooks/useToastMessage';`
3. Add: `const { message, showMessage } = useToastMessage();`
4. Replace inline spinner divs with `<ButtonSpinner />`.
5. Add: `import { ButtonSpinner } from '../../components/ui/Spinner';`

### Step 7.2 — Consolidate PaginationControls (Issue #4)

1. In [AttendancePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/AttendancePage.jsx): change import from `./components/PaginationControls` → `../../components/ui/PaginationControls`.
   - Map prop names if needed: if Attendance uses `itemsPerPage`, the shared component already handles it (per Phase 1 Step 1.4).
2. In [AssignmentPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/AssignmentPage.jsx): change import from `./components/AssignmentPaginationControls` → `../../components/ui/PaginationControls`.
   - Rename component usage from `<AssignmentPaginationControls>` → `<PaginationControls>`.
3. **Delete:** [src/features/attendance/components/PaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/components/PaginationControls.jsx)
4. **Delete:** [src/features/assignment/components/AssignmentPaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/components/AssignmentPaginationControls.jsx)

### Step 7.3 — Replace spinners in AttendancePage (Issue #8)

1. Add: `import { PageSpinner } from '../../components/ui/Spinner';`
2. Replace any `<div className="animate-spin rounded-full h-12 w-12 border-..." />` with `<PageSpinner size="h-12 w-12" />`.

### Step 7.4 — Notifications.jsx (Issue #13)

1. Delete the inline `getRelativeTime` function (~lines 12-28).
2. Add: `import { getRelativeTime } from '../utils';`

### Phase 7 — Self-Verification Checklist

- [ ] [CalendarPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/calendar/CalendarPage.jsx) no longer contains local `showMessage`
- [ ] [src/features/attendance/components/PaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/components/PaginationControls.jsx) is deleted
- [ ] [src/features/assignment/components/AssignmentPaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/components/AssignmentPaginationControls.jsx) is deleted
- [ ] [AttendancePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/AttendancePage.jsx) imports `PaginationControls` from `components/ui/`
- [ ] [AssignmentPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/AssignmentPage.jsx) imports `PaginationControls` from `components/ui/` and uses `<PaginationControls>` (not `<AssignmentPaginationControls>`)
- [ ] [Notifications.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Notifications.jsx) imports `getRelativeTime` from `utils`
- [ ] Dev server compiles without errors
- [ ] Calendar, Attendance, Assignment, Notifications pages all render identically
- [ ] Pagination works correctly on both Attendance and Assignment pages

---

## Phase 8 — Dead File Cleanup + Remaining api/axios Consumers

**Audit Issues:** #9, #11 (remaining consumers)

### Files WRITTEN/DELETED

| File | Action |
|------|--------|
| [src/App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css) | **[DELETE]** |
| [src/api/axios.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/api/axios.js) | **[DELETE]** (only after all consumers are migrated) |
| `src/features/result/api/api.js` | Update `api/axios` import → `lib/axios` |
| `src/features/examination/api/api.js` | Update `api/axios` import → `lib/axios` |
| [src/components/layout/AvatarUploadModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/AvatarUploadModal.jsx) | Update `api/axios` import → `lib/axios` |
| [src/components/layout/Header.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/Header.jsx) | Update `api/axios` import → `lib/axios` |

### Step 8.1 — Delete App.css (Issue #9)

1. Verify [App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css) is not imported anywhere (already confirmed: zero grep hits).
2. Delete [src/App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css).

### Step 8.2 — Migrate remaining `api/axios` consumers (Issue #11)

The following files still import from `api/axios` and are NOT touched by Phase 6:

| File | Current Import | New Import |
|------|---------------|------------|
| `src/features/result/api/api.js` | `import api from '../../../api/axios';` | `import api from '../../../lib/axios';` |
| `src/features/examination/api/api.js` | `import api from '../../../api/axios';` | `import api from '../../../lib/axios';` |
| [src/components/layout/AvatarUploadModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/AvatarUploadModal.jsx) | `import api from '../../api/axios';` | `import api from '../../lib/axios';` |
| [src/components/layout/Header.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/Header.jsx) | `import api from '../../api/axios';` | `import api from '../../lib/axios';` |

> Files **already migrated in Phase 6:** [Settings.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Settings.jsx), [DashboardLayout.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/layouts/DashboardLayout.jsx), [UserDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/components/UserDetailModal.jsx).

### Step 8.3 — Delete [src/api/axios.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/api/axios.js)

After all 7 consumers are migrated (4 in this phase + 3 in Phase 6):
1. Grep for `api/axios` to confirm zero remaining imports.
2. Delete [src/api/axios.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/api/axios.js).

### Phase 8 — Self-Verification Checklist

- [ ] [src/App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css) no longer exists
- [ ] [src/api/axios.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/api/axios.js) no longer exists
- [ ] Grep for `api/axios` returns zero hits across the entire `src/` directory
- [ ] Grep for [App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css) returns zero hits
- [ ] All 4 migrated files import from `lib/axios` and resolve correctly
- [ ] Dev server compiles without errors
- [ ] All pages that use API calls still function correctly

---

## Verification Plan

### Automated Verification

After **all phases** are complete, run from the `frontend/` directory:

```bash
# 1. Compilation check — no build errors
npm run build

# 2. Grep for remaining inline patterns that should have been removed
npx grep-it "const EmptyState" src/features/    # Expect: 0 hits
npx grep-it "const StatusBadge" src/features/   # Expect: 0 hits
npx grep-it "const SkeletonRow" src/features/   # Expect: 0 hits
npx grep-it "api/axios" src/                     # Expect: 0 hits
npx grep-it "App.css" src/                       # Expect: 0 hits
```

### Manual Verification (User)

Navigate to each page in the browser and confirm **pixel-identical rendering**:

1. **Dashboard** — cards, charts, role-specific content
2. **Fees** — all 6 tabs (Structures, Generate, History, Monthly, Yearly, Salary)
3. **Result** — table, skeleton loading, status badges, modals
4. **Examination** — exam list, modal, empty states
5. **Timetable** — grid, create/edit modal
6. **Calendar** — event creation, toast messages
7. **Attendance** — pagination, stat cards
8. **Assignment** — pagination, table, filters
9. **Notifications** — relative time display
10. **Settings** — toast messages, save actions
11. **Users** — table, detail modal, add user modal

---

## Conflict Register

The table below proves that **no file appears in more than one phase** (excluding Phase 1 shared files which are only created, not modified by later phases).

| File | Phase(s) | Sections Touched | Conflict? |
|------|----------|-----------------|-----------|
| [src/utils/index.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/utils/index.js) | 1 (append) | End of file only | ❌ None |
| [src/features/fees/FeesPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/fees/FeesPage.jsx) | 2 | Full file | ❌ None |
| `src/features/fees/components/FeeStructuresTab.jsx` | 2 [NEW] | — | ❌ None |
| `src/features/fees/components/StaffSalaryTab.jsx` | 2 [NEW] | — | ❌ None |
| `src/features/fees/components/StudentFeeHistoryTab.jsx` | 2 [NEW] | — | ❌ None |
| `src/features/fees/components/YearlySummaryTab.jsx` | 2 [NEW] | — | ❌ None |
| `src/features/fees/components/FeeMonthlyOverviewTab.jsx` | 2 [NEW] | — | ❌ None |
| [src/features/result/ResultPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/ResultPage.jsx) | 3 | Full file | ❌ None |
| [src/features/result/components/ResultDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultDetailModal.jsx) | 3 | Spinners only | ❌ None |
| [src/features/result/components/ResultEntryModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/result/components/ResultEntryModal.jsx) | 3 | Spinners only | ❌ None |
| [src/features/examination/ExaminationPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/examination/ExaminationPage.jsx) | 4 | Full file | ❌ None |
| [src/components/examination/ExamModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/examination/ExamModal.jsx) | 4 | Spinners only | ❌ None |
| [src/features/timetable/TimetablePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/TimetablePage.jsx) | 5 | readError + spinners | ❌ None |
| [src/features/timetable/components/TimetableModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/timetable/components/TimetableModal.jsx) | 5 | Spinners only | ❌ None |
| [src/pages/Settings.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Settings.jsx) | 6 | showMessage + spinners + import | ❌ None |
| [src/features/users/UsersPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/UsersPage.jsx) | 6 | showMessage + spinners | ❌ None |
| [src/features/users/components/UserDetailModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/users/components/UserDetailModal.jsx) | 6 | Import only | ❌ None |
| [src/pages/Dashboard.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Dashboard.jsx) | 6 | rolePrefix + style block | ❌ None |
| [src/layouts/DashboardLayout.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/layouts/DashboardLayout.jsx) | 6 | Import only | ❌ None |
| [src/features/calendar/CalendarPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/calendar/CalendarPage.jsx) | 7 | showMessage + spinners | ❌ None |
| [src/features/attendance/components/PaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/components/PaginationControls.jsx) | 7 [DELETE] | — | ❌ None |
| [src/features/attendance/AttendancePage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/attendance/AttendancePage.jsx) | 7 | Import + spinners | ❌ None |
| [src/features/assignment/components/AssignmentPaginationControls.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/components/AssignmentPaginationControls.jsx) | 7 [DELETE] | — | ❌ None |
| [src/features/assignment/AssignmentPage.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/features/assignment/AssignmentPage.jsx) | 7 | Import only | ❌ None |
| [src/pages/Notifications.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/pages/Notifications.jsx) | 7 | getRelativeTime | ❌ None |
| [src/App.css](file:///D:/Protap/SMS/School-Management-System/frontend/src/App.css) | 8 [DELETE] | — | ❌ None |
| [src/api/axios.js](file:///D:/Protap/SMS/School-Management-System/frontend/src/api/axios.js) | 8 [DELETE] | — | ❌ None |
| `src/features/result/api/api.js` | 8 | Import only | ❌ None |
| `src/features/examination/api/api.js` | 8 | Import only | ❌ None |
| [src/components/layout/AvatarUploadModal.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/AvatarUploadModal.jsx) | 8 | Import only | ❌ None |
| [src/components/layout/Header.jsx](file:///D:/Protap/SMS/School-Management-System/frontend/src/components/layout/Header.jsx) | 8 | Import only | ❌ None |
| `src/components/ui/EmptyState.jsx` | 1 [NEW] | — | ❌ None |
| `src/components/ui/StatusBadge.jsx` | 1 [NEW] | — | ❌ None |
| `src/components/ui/SkeletonRows.jsx` | 1 [NEW] | — | ❌ None |
| `src/components/ui/PaginationControls.jsx` | 1 [NEW] | — | ❌ None |
| `src/components/ui/Spinner.jsx` | 1 [NEW] | — | ❌ None |
| `src/hooks/useToastMessage.js` | 1 [NEW] | — | ❌ None |

**Result: Zero conflicts. Every file is touched by exactly one phase.**

> [!NOTE]
> The shadcn adoption items (S1-S8) from the second-pass review are **intentionally excluded** from this plan because they introduce **visual and behavioral changes** (e.g., replacing raw `<button>` with shadcn `Button` changes styling; replacing modals with `Dialog` changes animation/backdrop). These violate the "zero visual/functional change" constraint and should be addressed in a separate shadcn migration plan.
