# 🎯 OPTIMIZED Implementation Prompt
## Real-Time Class/Section Sync System — School Management Platform

---

> **PURPOSE OF THIS DOCUMENT**
> This is an **OPTIMIZED version** of the implementation prompt, revised based on actual codebase analysis. All assumptions have been verified against the existing codebase, and corrections have been applied.
>
> Use this prompt verbatim as input to generate a **one-shot implementation plan `.md` file**.

---

## MANDATORY PRE-ANALYSIS FINDINGS (Verified)

### 1.1 Architecture Summary (VERIFIED)
| Item | Finding | File Reference |
|------|---------|----------------|
| Frontend Framework | React 19 + Vite | `frontend/package.json` |
| State Management | Redux Toolkit + React Redux + TanStack Query | `frontend/src/state/store.js`, `frontend/src/state/providers.jsx` |
| Backend Framework | Express 5 + Node.js | `backend/package.json` |
| Database ORM | MongoDB (Mongoose) | `backend/src/module/school/School.model.js` |
| WebSocket Server | Socket.io (already configured) | `backend/src/socket.js` (getIO function available) |
| WebSocket Client | socket.io-client (already configured) | `frontend/src/api/socket.js` (connectSocket function available) |
| HTTP Client | Axios | `frontend/src/lib/axios.js` |
| Existing Global Stores | auth, ui, theme (Redux slices) | `frontend/src/state/` |

### 1.2 Settings Module Audit (VERIFIED)
| Item | Finding |
|------|---------|
| **Settings Page** | `frontend/src/pages/Settings.jsx` (36,438 chars) - already has full class/section management |
| **Existing API Endpoints** | ✅ ALL EXIST - no creation needed: |
| | - GET `/api/v1/school/classes` → returns { standards, sections, classSections, subjects, rooms } |
| | - POST `/api/v1/school/classes` → body: { standard, section } |
| | - DELETE `/api/v1/school/classes` → body: { standard, section } |
| **Current Fetch Pattern** | Direct `api.get('/school/classes')` call in Settings.jsx (NOT using React Query) |
| **DB Schema** | `School.academic.classSections` array of objects: `{ standard: "5", section: "A" }` |
| **CRITICAL: No ID Field** | Classes/sections have NO _id - stored as plain objects in array. Use **composite key** `${standard}::${section}` for identification |

### 1.3 Consumer Modules Audit (VERIFIED)

| Module | File Path | Current Pattern | Uses Shared Hook? |
|--------|-----------|-----------------|-------------------|
| Dashboard | `frontend/src/pages/Dashboard.jsx` | Direct API, Socket for attendance | ❌ No |
| Users | `frontend/src/features/users/components/AddUserModal.jsx` | `useSchoolClasses` hook | ✅ YES |
| Fees | `frontend/src/features/fees/FeesPage.jsx` | `useSchoolClasses` hook | ✅ YES |
| Timetable | `frontend/src/features/timetable/api/queries.js` | Direct API + `useSchoolClasses` | ⚠️ Partial |
| Examination | `frontend/src/features/examination/ExaminationPage.jsx` | `useSchoolClasses` hook | ✅ YES |
| Notice | `frontend/src/features/notices/api/queries.js` | Custom event listener | ⚠️ Partial |
| Assignment | `frontend/src/features/assignment/hooks/useAssignmentOptions.js` | Custom event listener | ⚠️ Partial |

### 1.4 Existing Real-Time Infrastructure (VERIFIED)

| Item | Finding |
|------|---------|
| **Socket.io Server** | ✅ EXISTS - `getIO()` function in `backend/src/socket.js` |
| **Socket.io Client** | ✅ EXISTS - `connectSocket(schoolId)` in `frontend/src/api/socket.js` |
| **Room Pattern** | ✅ EXISTS - `school-{schoolId}` rooms already implemented |
| **Existing Events** | ✅ `attendance-marked` event used in Dashboard.jsx |
| **Current "Sync" Mechanism** | Custom event `customClassesUpdated` - dispatched via `window.dispatchEvent()` after create/delete |

### 1.5 Existing Shared State Hook (VERIFIED)

**File:** `frontend/src/hooks/useSchoolClasses.js`
- Uses TanStack Query with 5-minute staleTime
- Returns: `availableStandards`, `allUniqueSections`, `getSectionsForStandard`, `classSectionsMap`
- Currently uses custom event `customClassesUpdated` for refetch trigger
- Already used by: fees, examination, users, timetable, notices, assignment modules

---

## FEATURE SPECIFICATIONS (Corrected)

### FEATURE A — Settings Page: Class/Section List with "New" Badge

#### A.1 — Display Behaviour
- ✅ UNCHANGED from original prompt

#### A.2 — "New" Badge Logic (CORRECTED)
- **CRITICAL:** Classes/sections have NO `_id` field in the database
- Use **composite key** `${standard}::${section}` for identification instead of ID
- Example: "5" + "A" = "5::A"
- Implementation: Store newly created composite keys in a `useRef` or local `useState` Set
- Badge appears immediately upon creation, disappears on navigation away or refresh
- Must NOT persist in localStorage/sessionStorage - only in-memory

#### A.3 — Create / Delete Operations
- ✅ API endpoints already exist - no creation needed
- Add socket emission after successful create/delete (backend)
- Add socket listener in frontend hook for real-time updates
- Emit custom event as fallback for cross-tab sync (current pattern)

---

### FEATURE B — Global Real-Time Class/Section State

#### B.1 — Single Source of Truth
- **EXISTING:** `useSchoolClasses` hook already provides this
- **ENHANCEMENT:** Replace custom event refetch with Socket.io listener
- All consumer modules (fees, timetable, examination, users, etc.) already use this hook

#### B.2 — Real-Time Sync Mechanism (CORRECTED)

**SELECTED STRATEGY: Socket.io with Custom Event Fallback**

| Component | Action |
|-----------|--------|
| Backend | Emit `class:created` / `class:deleted` events via `getIO()` in school.service.js |
| Frontend Hook | Add socket listener in `useSchoolClasses.js` for real-time updates |
| Cross-Tab Sync | Keep `customClassesUpdated` event as fallback (current pattern works) |

**Implementation:**
```javascript
// In useSchoolClasses.js - ADD socket listener
import { connectSocket } from '../api/socket';

useEffect(() => {
    const socket = connectSocket(schoolId);
    const handleClassUpdate = () => refetch();
    socket.on('class:created', handleClassUpdate);
    socket.on('class:deleted', handleClassUpdate);
    return () => {
        socket.off('class:created', handleClassUpdate);
        socket.off('class:deleted', handleClassUpdate);
    };
}, [schoolId]);
```

#### B.3 — Propagation Contract
- ✅ UNCHANGED from original prompt

#### B.4 — Consumer Module Refactor Rules
- **Settings.jsx:** Replace direct API call with `useSchoolClasses` hook
- **Other modules:** Already using hook - just need to ensure socket integration works
- **Dashboard:** Currently doesn't fetch classes - may not need refactor

---

## IMPLEMENTATION PLAN FORMAT REQUIREMENTS

The output implementation plan `.md` must contain **all** of the following sections, in order:

### Required Sections in Output `.md`

```
# Implementation Plan: Real-Time Class/Section Sync

## 1. Codebase Audit Results (VERIFIED)
   - 1.1 Architecture Summary
   - 1.2 Settings Module Audit
   - 1.3 Consumer Modules Audit Table (filled with verified data)
   - 1.4 Real-Time Infrastructure Status
   - 1.5 Existing Shared State Hook

## 2. Architecture Decision Record (ADR)
   - Selected: Socket.io with custom event fallback
   - Rationale: Infrastructure already exists, pattern proven with attendance

## 3. Database / API Layer Changes
   - NO NEW ENDPOINTS NEEDED - endpoints already exist
   - ADD socket events in school.service.js after create/delete
   - Event names: `class:created`, `class:deleted`
   - Payload: `{ classSections: [...] }`

## 4. Shared State Layer
   - File: `frontend/src/hooks/useSchoolClasses.js` (MODIFY - add socket)
   - Add socket listener for real-time updates
   - Keep custom event fallback for cross-tab sync

## 5. Phase-by-Phase Implementation
   ### Phase 1: Backend Socket Events
   ### Phase 2: Frontend Hook Socket Integration  
   ### Phase 3: Settings Page Refactor (use shared hook)
   ### Phase 4: Testing & Validation

## 6. File Change Index

## 7. Edge Cases & Guard Rails

## 8. Rollback Plan
```

---

## CRITICAL DIFFERENCES FROM ORIGINAL PROMPT

| Original Prompt Assumed | Reality (Verified) | Impact |
|------------------------|-------------------|--------|
| Create new API endpoints | Endpoints already exist | Skip endpoint creation tasks |
| Use ID for class/section | No _id field exists | Use composite key `${standard}::${section}` |
| Build shared state from scratch | `useSchoolClasses` hook exists | Modify existing hook, not create new |
| No existing real-time for classes | Socket.io infrastructure exists | Leverage existing infrastructure |
| Greenfield implementation | Enhancement of existing | Refactor Settings.jsx to use shared hook |

---

## OUTPUT CONSTRAINTS

- The output must be a **single `.md` file**
- Minimum detail level: a mid-level developer (2–3 years experience) must be able to execute without questions
- Every code snippet must be complete and copy-pasteable
- Use verified file paths from this document

---

## FINAL INSTRUCTION

Use the verified findings in this document as the baseline for your implementation plan. The plan should leverage existing infrastructure (socket.io, useSchoolClasses hook) and focus on enhancing the current implementation with real-time capabilities.