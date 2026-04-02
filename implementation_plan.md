# Implementation Plan: Settings-Driven Real-Time Class/Section Sync

Last updated: 2026-03-25

## 1. Requirement Lock

This implementation must make `School.academic.classSections` the only active class/section catalog for a school.

Required behavior:

1. The Settings page must show the full sorted class-section list from the current school's database.
2. When a class-section is created in Settings, it must show a local `New` badge only for the current Settings page session.
3. That `New` badge must disappear after navigation away, remount, or full reload.
4. Dashboard, Users, teacher-facing class selectors, Fees, Timetable, Assignment, Examination, Notice, and any other active class/section picker must use the same settings-owned list.
5. Create/delete changes from Settings must propagate to other open screens and clients without a full website reload.
6. Removed classes must stop appearing as active options everywhere, even if old students, fees, exams, or assignments still reference them historically.

Assumptions for a safe one-shot implementation:

1. Historical financial/academic records should be preserved unless the module already performs safe cleanup.
2. Active selectors and default overview screens must exclude removed classes immediately.
3. Only routed pages/components need to be changed. `frontend/src/pages/Timetable.jsx` is legacy and is not used by the current router.

## 2. Verified Codebase Audit

### 2.1 Backend source of truth already exists

- `backend/src/module/school/School.model.js`
  - Stores classes under `academic.classSections`.
  - Each item is a plain object with `{ standard, section }`.
  - There is no `_id` per class-section item.
- `backend/src/module/school/school.service.js`
  - `getSchoolClasses()` already returns:
    - `standards`
    - `sections`
    - `classSections`
    - `subjects`
    - `rooms`
  - `addSchoolClassSection()` and `removeSchoolClassSection()` already exist.
  - Sorting is already implemented server-side.

### 2.2 Existing API surface is sufficient

No new endpoint is required.

- `GET /api/v1/school/classes`
- `POST /api/v1/school/classes`
- `DELETE /api/v1/school/classes`

### 2.3 Real-time infrastructure exists, but one blocker is real

- `backend/src/socket.js`
  - Socket server requires `socket.handshake.auth.token`.
  - School rooms already exist as `school-${schoolId}`.
- `frontend/src/api/socket.js`
  - Client connects and joins rooms.
  - Client does not send the auth token at all.

This means current class real-time sync cannot be trusted until socket auth is fixed.

### 2.4 Settings page is partly ready

- `frontend/src/pages/Settings.jsx`
  - Already uses `useSchoolClasses()`.
  - Already keeps local `newlyCreatedKeys` in memory, which is the right shape for the `New` badge requirement.
  - Still relies on:
    - direct `api.post('/school/classes')`
    - direct `api.delete('/school/classes')`
    - `window.dispatchEvent(new Event('customClassesUpdated'))`

The badge behavior is close, but propagation is still fragmented.

### 2.5 Active frontend consumers are inconsistent today

| Surface | Current source | Status |
|---|---|---|
| Settings | `useSchoolClasses` | Good base, needs shared mutation/cache flow |
| Users Add modal | `useSchoolClasses` | Good |
| Users detail modal | direct `/school/classes` fetch | Must migrate |
| Dashboard | derives class list from student groups | Must migrate |
| Fees filters | `useSchoolClasses` | Good base |
| Fees overviews | derives classes from fee data | Must filter by settings |
| Timetable | own `/school/classes` query | Must unify |
| Assignment | metadata query for classes + subjects | Must split classes from subjects |
| Examination page/modal | `useSchoolClasses` | Good base, backend still missing validation |
| Notice | own `/school/classes` query | Must unify |
| Calendar | own `/school/classes` fetch for admin | Must unify |
| Attendance | derives groups from student profiles | Should align to avoid removed ghost classes |
| Result | derives filter options from completed exams | Secondary alignment recommended |

### 2.6 Backend validation is also inconsistent today

Already settings-driven:

- `backend/src/module/timetable/timetable.service.js`
- `backend/src/module/assignment/assignment.service.js`
- `backend/src/module/notice/notice.service.js`

Not fully settings-driven:

- `backend/src/module/user/user.service.js`
  - user creation does not verify student/teacher class data against Settings
- `backend/src/module/examination/examination.service.js`
  - exam creation does not verify class-section against Settings
- `backend/src/module/fees/fees.service.js`
  - allows a fallback if matching students exist, even when Settings no longer contains the class
- `backend/src/module/calendar/calendar.service.js`
  - allows a fallback if student profiles exist, even when Settings no longer contains the class

### 2.7 Deletion side effects are partial

`backend/src/module/school/school.service.js -> removeSchoolClassSection()` already cleans:

- teacher assigned classes
- student profiles
- notice recipients
- timetable data

It does not clean or suppress all class-bound data in:

- fees
- assignment
- examination
- result
- calendar

So the implementation must explicitly decide how those modules behave after class removal.

## 3. Architecture Decision Record

### Decision

Use `School.academic.classSections` as the canonical write/read source and propagate changes with:

1. immediate local TanStack cache updates on Settings mutations
2. authenticated Socket.io snapshot events for all open clients
3. temporary `customClassesUpdated` fallback only for legacy listeners during migration

### Why this is the right fit here

- The backend model and APIs already exist.
- Socket rooms already exist per school.
- Several screens already depend on TanStack Query.
- The app does not need a new Redux slice for this; query cache is enough.

### Canonical identifier

Because class-section items do not have `_id`, all client-side tracking must use:

`classKey = ${standard.trim().toLowerCase()}::${section.trim().toUpperCase()}`

This applies to:

- Settings `New` badge
- local dedupe
- cache comparisons
- selection reset logic

### Event contract

Add one canonical payload shape for class sync:

```json
{
  "schoolId": "664f...",
  "action": "created",
  "changed": { "standard": "10", "section": "A" },
  "classSections": [{ "standard": "10", "section": "A" }],
  "standards": ["10"],
  "sections": ["A"],
  "subjects": ["Math"],
  "rooms": ["101"],
  "version": "2026-03-25T14:30:00.000Z"
}
```

Recommended implementation detail:

- emit canonical event: `school:classes:changed`
- keep `class:created` / `class:deleted` as short-lived compatibility aliases during rollout

## 4. Target State

### 4.1 One read path

Every active class/section selector should read from one shared hook/query only:

- query key: `['school', schoolId, 'classes']`
- source endpoint: `GET /school/classes`

### 4.2 One write path

Settings mutations should:

1. call the existing POST/DELETE API
2. write returned payload into the shared query cache immediately
3. update local `newlyCreatedKeys` only in Settings
4. let the socket update all other open clients

### 4.3 One rule for other modules

Other modules may still derive:

- students
- subjects
- fees
- results
- assignments

But they must never derive the active class/section option list from those datasets.

They may only:

1. join their module data against the configured class set
2. filter out removed classes from active views
3. preserve historical records where deletion would be unsafe

## 5. Phase-by-Phase Execution Plan

### Phase 1: Foundation and Shared Utilities

Goal: establish one canonical class-section helper set on both backend and frontend.

Backend changes:

- Add a shared class-section utility module, preferably `backend/src/utils/classSection.util.js`
- Move duplicated helpers into it:
  - normalize class-section
  - build composite key
  - sort class-sections
  - load configured class set for a school
  - assert a class-section exists in Settings
  - assert a list of target classes exists in Settings

Frontend changes:

- Add a small shared helper, preferably `frontend/src/utils/classSection.js`
- Expose:
  - `makeClassKey`
  - `sortClassSections`
  - `normalizeClassSection`

Why Phase 1 must happen first:

- the backend currently duplicates this logic in school, timetable, fees, assignment, notice, and calendar
- the frontend duplicates the same composite-key and sort logic in Settings and other places

### Phase 2: Fix Real-Time Transport First

Goal: make the socket connection actually authenticated and usable.

Files:

- `frontend/src/api/socket.js`
- `frontend/src/lib/axios.js`
- optionally `frontend/src/features/auth/useAuth.js` if a token bridge is needed

Required changes:

1. send the current access token in `io(..., { auth: { token } })`
2. update `socket.auth.token` before reconnects
3. ensure reconnect after refresh-token renewal does not leave the socket on a stale token

Why this is mandatory:

- backend already rejects unauthenticated sockets
- every instant cross-client update depends on this being correct

### Phase 3: Backend Class Sync Hardening

Goal: make backend create/delete and validations consistently settings-driven.

Files:

- `backend/src/module/school/school.service.js`
- `backend/src/module/user/user.service.js`
- `backend/src/module/examination/examination.service.js`
- `backend/src/module/fees/fees.service.js`
- `backend/src/module/calendar/calendar.service.js`

Work:

1. In `school.service.js`
   - after create/delete, build the full `/school/classes` snapshot
   - emit `school:classes:changed`
   - keep legacy `class:created` / `class:deleted` temporarily if needed

2. In `user.service.js`
   - validate student `standard/section` against Settings before profile creation
   - validate teacher `assignedClasses` or `standard/section` against Settings before profile creation

3. In `examination.service.js`
   - validate exam `standard/section` against Settings on create

4. In `fees.service.js`
   - remove the fallback that treats matching students as enough
   - active fee structures must be creatable only for configured classes

5. In `calendar.service.js`
   - remove the fallback that treats student profiles as valid target classes
   - teacher/admin class targeting must accept only configured classes

Recommended rule:

- Settings is the only source for active classes
- student existence is not a substitute for active configuration

### Phase 4: Canonical Frontend Query and Cache Updates

Goal: move the app to one school-classes cache contract.

Primary file:

- `frontend/src/hooks/useSchoolClasses.js`

Required changes:

1. scope query key by schoolId
   - current constant `['school', 'classes']` should become school-aware

2. return both raw and derived data
   - `classSections`
   - `availableStandards`
   - `allUniqueSections`
   - `getSectionsForStandard`
   - `subjects`
   - `rooms`
   - raw payload for advanced consumers

3. on class sync event:
   - prefer `queryClient.setQueryData()` when full snapshot exists
   - otherwise invalidate/refetch

4. keep `customClassesUpdated` only as temporary legacy support

Important guard rail:

- avoid each consumer maintaining its own `/school/classes` cache with a different key

### Phase 5: Settings Page Completion

Goal: finish the source screen so it updates itself immediately and other pages consistently.

File:

- `frontend/src/pages/Settings.jsx`

Required changes:

1. keep `newlyCreatedKeys` local and in-memory only
2. on successful create:
   - add the composite key to `newlyCreatedKeys`
   - write returned payload into the shared query cache immediately
3. on successful delete:
   - remove the composite key from `newlyCreatedKeys`
   - write returned payload into the shared query cache immediately
4. stop relying on ad hoc refetch timing for the creator tab
5. keep the badge purely local to the current Settings mount

Expected badge behavior:

- user creates `10-A` -> badge appears beside `10-A`
- user navigates away and back -> badge is gone
- user reloads -> badge is gone
- another admin on another browser sees the new class, but not the creator's local `New` badge

### Phase 6: Consumer Migration by Module

#### Dashboard

Files:

- `frontend/src/pages/Dashboard.jsx`

Changes:

1. drive admin class filter options from `useSchoolClasses().classSections`
2. keep student/attendance stats as data sources, but intersect displayed class groups with configured class keys
3. reset `selectedClass` to `all` if the chosen class is deleted
4. allow configured classes with zero students to appear as valid filter options if the UX should mirror Settings exactly

Why:

- current dashboard invents its active class universe from student profiles
- deleted classes can survive there as ghost groups

#### Users

Files:

- `frontend/src/features/users/components/AddUserModal.jsx`
- `frontend/src/features/users/components/UserDetailModal.jsx`

Changes:

1. keep Add modal on the shared hook
2. replace direct `/school/classes` fetch in UserDetailModal with the shared hook
3. reset `section` when its parent `standard` becomes invalid after a live update

#### Fees

Files:

- `frontend/src/features/fees/FeesPage.jsx`

Changes:

1. keep filter/dropdown options sourced from the shared hook
2. filter overview class rows against the configured class set
3. reset `selectedClass` if that class is deleted
4. ensure fee-structure creation cannot target removed classes

Why:

- filters already use the hook
- overview tables still derive class presence from fee assignment data

#### Timetable

Files:

- `frontend/src/features/timetable/api/queries.js`
- `frontend/src/features/timetable/TimetablePage.jsx`
- `frontend/src/features/timetable/components/CreateTimetableDialog.jsx`

Changes:

1. stop owning an independent `/school/classes` query for active class options
2. consume the shared hook payload, or reuse the exact same query key if subjects/rooms must stay in the timetable layer
3. keep timetable selection reset when a class is deleted
4. preserve current server-side timetable cleanup on class deletion

#### Assignment

Files:

- `frontend/src/features/assignment/hooks/useAssignmentOptions.js`
- `frontend/src/features/assignment/components/AssignmentModal.jsx`
- `frontend/src/features/assignment/components/AssignmentFilters.jsx`

Changes:

1. split class sourcing from subject sourcing
2. standards/sections must come from `useSchoolClasses`
3. subjects can continue coming from assignment metadata
4. invalidate assignment metadata on class changes only if subject mappings need recalculation

Why:

- the module currently mixes settings-owned class data with assignment/timetable-derived metadata

#### Examination

Files:

- `frontend/src/features/examination/ExaminationPage.jsx`
- `frontend/src/components/examination/ExamModal.jsx`
- `backend/src/module/examination/examination.service.js`

Changes:

1. keep frontend options on the shared hook
2. add backend validation so exam creation cannot bypass Settings
3. reset invalid filters or form selections if a class is deleted during use

#### Notice

Files:

- `frontend/src/features/notices/api/api.js`
- `frontend/src/features/notices/api/queries.js`
- `frontend/src/features/notices/useNoticeHandlers.js`

Changes:

1. stop creating a dedicated `/school/classes` query just for notices
2. map notice recipient class options from the shared hook
3. keep backend validation in `notice.service.js` as the final guard

#### Calendar

Files:

- `frontend/src/features/calendar/CalendarPage.jsx`
- `backend/src/module/calendar/calendar.service.js`

Changes:

1. replace admin-side direct `/school/classes` fetch with the shared hook
2. teacher assigned classes should be intersected with configured settings classes
3. backend must reject removed classes even if stale student data exists

#### Attendance and Result

These are secondary but recommended in the same rollout if "across the app" is strict.

Attendance:

- `frontend/src/features/attendance/AttendancePage.jsx`
- intersect grouped classes with configured settings classes so deleted classes disappear from the active class list immediately

Result:

- `frontend/src/features/result/ResultPage.jsx`
- derive filter options from `configured classes intersect completed exam classes` instead of completed exams alone

## 6. Behavior on Class Deletion

Recommended policy for this rollout:

1. Hard-clean only where the app already does so safely:
   - timetable
   - notice recipients
   - teacher assignments
2. Preserve historical records in:
   - assignments
   - fees
   - examinations
   - results
   - calendar history
3. Exclude those preserved records from active class selectors and default class overview lists if their class is no longer configured

Why this policy is safest:

- it satisfies the user-facing requirement that active classes come only from Settings
- it avoids destructive loss of academic or financial history

## 7. File Change Index

### Add

- `backend/src/utils/classSection.util.js`
- `frontend/src/utils/classSection.js`

### Modify

- `backend/src/module/school/school.service.js`
- `backend/src/module/user/user.service.js`
- `backend/src/module/examination/examination.service.js`
- `backend/src/module/fees/fees.service.js`
- `backend/src/module/calendar/calendar.service.js`
- `frontend/src/api/socket.js`
- `frontend/src/hooks/useSchoolClasses.js`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/features/users/components/UserDetailModal.jsx`
- `frontend/src/features/fees/FeesPage.jsx`
- `frontend/src/features/timetable/api/queries.js`
- `frontend/src/features/timetable/TimetablePage.jsx`
- `frontend/src/features/assignment/hooks/useAssignmentOptions.js`
- `frontend/src/features/notices/api/api.js`
- `frontend/src/features/notices/api/queries.js`
- `frontend/src/features/notices/useNoticeHandlers.js`
- `frontend/src/features/calendar/CalendarPage.jsx`

### Optional same-pass alignment

- `frontend/src/features/attendance/AttendancePage.jsx`
- `frontend/src/features/result/ResultPage.jsx`

## 8. Edge Cases and Guard Rails

1. Multiple admins create/delete at the same time
   - always trust the server snapshot, not local optimistic ordering

2. A selected class disappears while a user is on another page
   - reset invalid selections to `all` or blank
   - show a toast like: `Selected class was removed from Settings`

3. Socket temporarily disconnected
   - creator tab still updates from mutation success cache write
   - other clients resync on reconnect via snapshot event and query invalidation

4. Section mismatch after a standard changes
   - always clear invalid `section` state if it no longer belongs to the selected standard

5. New badge leakage
   - never store it in Redux, localStorage, sessionStorage, or server

6. Legacy listeners during migration
   - keep `customClassesUpdated` only until all consumers are moved to the shared query/hook path

7. Non-routed legacy files
   - do not spend implementation time on `frontend/src/pages/Timetable.jsx`

## 9. Verification Matrix

Because the repo has no real automated test suite today, this rollout needs a strict manual verification pass plus build/lint.

### Required commands

- Frontend: `npm run lint`
- Frontend: `npm run build`
- Backend: start app and verify logs for socket joins and class events

### Manual scenarios

1. Create `10-A` in Settings and confirm:
   - it appears immediately in Settings
   - it shows `New`
   - it appears in Dashboard filter, Users modal, Fees filters, Timetable create dialog, Assignment modal, Exam modal, Notice recipient picker, Calendar class picker without reload

2. Reload Settings and confirm the `New` badge is gone.

3. Open two admin browsers for the same school:
   - create a class in browser A
   - confirm browser B updates without refresh

4. Delete a class in Settings and confirm:
   - it disappears from Settings
   - active selectors reset if they were pointing at it
   - Dashboard and Fees overviews no longer list it as an active class
   - Timetable selection disappears immediately

5. Try to create:
   - a student in a removed class
   - a teacher assigned to a removed class
   - an exam for a removed class
   - a fee structure for a removed class
   - a calendar event for a removed class
   and confirm all are rejected

6. Confirm notice class recipients only show settings-owned classes.

7. Confirm timetable cleanup still works after class deletion.

## 10. Rollback Plan

If the rollout causes instability:

1. keep backend validation helpers but disable socket-driven cache writes first
2. fall back to invalidate/refetch on class changes
3. keep Settings as the only writer
4. revert module-by-module frontend migrations individually, starting with:
   - Dashboard
   - Calendar
   - Notice
   - Assignment
5. do not roll back the source-of-truth model or existing `/school/classes` endpoint

Recommended rollback boundary:

- backend validation and event emission can stay
- frontend consumer migrations can be reverted incrementally if a specific screen regresses

## 11. Execution Order Summary

For the cleanest one-shot implementation, execute in this exact order:

1. shared backend/frontend class-section utilities
2. socket auth fix
3. backend class sync snapshot emission
4. `useSchoolClasses` cache unification
5. Settings mutation/cache flow and local `New` badge finalization
6. Dashboard, Users, Fees, Timetable, Assignment, Examination, Notice, Calendar consumer migrations
7. secondary Attendance and Result alignment if strict app-wide parity is required
8. lint, build, and live multi-client verification
