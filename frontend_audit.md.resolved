# Frontend Architecture Audit

## Overall Verdict: **Bad — but fixable**

The frontend has the right tools installed (TanStack Query, Redux Toolkit, Tailwind v4, Vite, React 19) but uses them **inconsistently**. Some modules follow modern patterns well (users), while others completely ignore the architecture and do raw `axios` calls with manual `useState`/`useEffect` (Settings, Calendar, Timetable page). The result is **duplicated API layers**, **monster page files**, and **wasted caching**.

---

## 1. Data Fetching — Mixed & Inconsistent

### What it should be
- **TanStack Query** → all server data (fetching, caching, mutations)
- **Redux** → client-only UI state (sidebar, theme, auth session)

### What it actually is

| Module | Feature API (`features/*/api/`) | TanStack Query Hooks (`features/*/queries.js`) | Actually used in page? |
|---|---|---|---|
| **Users** | ✅ [features/users/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/users/api/api.js) | ✅ [features/users/api/queries.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/users/api/queries.js) | ✅ [UsersPage.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/UsersPage.jsx) uses feature hooks |
| **Timetable** | ✅ [features/timetable/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/api.js) | ✅ [features/timetable/api/queries.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js) | ❌ **Page ignores both** — uses [useTimetableData](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js#6-358) hook |
| **Notices** | ✅ [features/notices/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/notices/api/api.js) | ✅ `features/notices/api/queries.js` | ⚠️ Partially — [Notice.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Notice.jsx) uses query hooks for reads |
| **Settings** | ✅ [features/settings/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/settings/api/api.js) | ✅ `features/settings/api/queries.js` | ❌ **Page ignores both** — uses raw `api.get()` |
| **Dashboard** | ✅ [features/dashboard/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js) | ✅ `features/dashboard/api/queries.js` | ⚠️ Partially |
| **Auth** | ✅ `features/auth/api/api.js` | — (uses [useAuth](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/auth/useAuth.js#9-92) hook) | ✅ Properly bridges Redux + TanStack |
| **Calendar** | ❌ No feature module | ❌ No hooks | ❌ Raw `api` calls in page |

> [!CAUTION]
> **Timetable & Settings have feature modules with TanStack hooks ready to go... but the page files completely ignore them and do manual fetching instead.**

### The Timetable Duplication Disaster

There are **3 separate timetable API layers** doing the same thing:

| File | Lines | Used by |
|---|---|---|
| [src/api/timetable.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/timetable.js) | 165 | [useTimetableData](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js#6-358) hook |
| [src/features/timetable/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/api.js) | 82 | [features/timetable/api/queries.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js) (TanStack) |
| [src/hooks/useTimetableData.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js) | 358 | [Timetable.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Timetable.jsx) page |

The **massive 358-line [useTimetableData](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js#6-358) hook** rebuilds everything TanStack Query does for free — manual loading states, manual error states, manual cache invalidation via `fetchX()` calls. This is the worst offender.

---

## 2. Monster Page Files

Every page is a **single giant file** mixing UI, business logic, data fetching, and modals:

| Page | Lines | Size | Problem |
|---|---|---|---|
| [Notice.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Notice.jsx) | **727** | 52 KB | Everything inline — renders, handlers, render helpers, modal UI |
| [UsersPage.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/UsersPage.jsx) | **543** | 40 KB | Table, filters, bulk actions, modals, dropdowns all in one |
| [Settings.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Settings.jsx) | **349** | 21 KB | Raw API calls, feature toggles, theme, logo upload |
| [Calendar.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Calendar.jsx) | **293** | 18 KB | Raw API calls, event CRUD, calendar rendering |
| [Timetable.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Timetable.jsx) | **277** | 14 KB | Uses imperative hook, inline create modal |
| [Attendance.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Attendance.jsx) | **~280** | 15 KB | Full page with inline modal |

> [!WARNING]
> These files are hard to maintain, test, and review. A single JSX file should ideally be under **150 lines**.

---

## 3. Route Duplication in [App.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/App.jsx)

The same page component is mounted **3 times** for different role prefixes:

```jsx
// Same UsersPage mounted 3 times with different paths
<Route path="/superadmin/users" element={<UsersPage />} />
<Route path="/admin/users" element={<UsersPage />} />
<Route path="/teacher/users" element={<UsersPage />} />

// Same TimetablePage mounted 2 times
<Route path="/admin/timetable" element={<TimetablePage />} />
<Route path="/teacher/timetable" element={<TimetablePage />} />
```

This creates **16+ duplicate route entries** when a single dynamic route like `/:role/users` with role-based middleware would suffice.

---

## 4. Component Scattering

Components are split between `src/components/` (global) and feature-specific locations with no clear rule:

```
src/components/
├── AddUserModal.jsx      ← Should be in users feature
├── timetable/
│   ├── TimetableGrid.jsx ← Should be in timetable feature
│   └── TimetableModal.jsx
├── users/
│   └── UserDetailModal.jsx
├── attendance/
│   └── StudentHistoryModal.jsx
├── layout/               ← OK, these are global
├── ui/                   ← Basically empty (just an index.js)
└── form/                 ← Basically empty (just an index.js)
```

---

## 5. Duplicate API Functions Across Features

Multiple features define identical API calls:

| API Call | Defined In |
|---|---|
| [getTeachers()](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/notices/api/api.js#71-76) → `GET /users?role=teacher` | [features/timetable/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/api.js), [features/notices/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/notices/api/api.js), [features/dashboard/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js), [src/api/timetable.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/timetable.js) |
| [getStudents()](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js#5-11) → `GET /users?role=student` | [features/notices/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/notices/api/api.js), [features/dashboard/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js) |
| [getAllUsers()](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js#19-25) → `GET /users` | [features/notices/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/notices/api/api.js), [features/dashboard/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/dashboard/api/api.js) |
| [getSchoolProfile()](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/backend/src/module/school/school.service.js#58-79) → `GET /school` | [features/settings/api/api.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/settings/api/api.js), [state/hooks.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/state/hooks.js) (inline) |

These should be centralized in the **users feature** and imported where needed.

---

## 6. Redux Usage — Actually Fine ✅

Redux is used **correctly** for client-only state:

| Slice | Purpose | Correct? |
|---|---|---|
| `authSlice` | User session, auth state | ✅ |
| `themeSlice` | Accent color, branding | ✅ |
| `uiSlice` | Sidebar collapsed state | ✅ |

The [useAuth](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/auth/useAuth.js#9-92) hook is a good example of bridging Redux + TanStack Query properly.

---

## 7. shadcn/ui Recommendation

> [!IMPORTANT]
> **Yes, shadcn/ui is a great fit** for this project.

### Why shadcn works here

1. **You're already on Tailwind v4** — shadcn components use Tailwind classes natively
2. **You're using React 19 + Vite** — fully supported
3. **You're hand-building every UI primitive** — buttons, modals, dropdowns, toggles, tabs, selects, inputs are all custom in every page file. shadcn gives you these out of the box
4. **Dark mode support** — comes free with shadcn's theming system
5. **Copy-paste model** — you OWN the component code. No heavy dependency, you can customize everything
6. **Accessible by default** — built on Radix UI primitives

### What shadcn replaces

| Current (hand-built) | shadcn replacement |
|---|---|
| Custom modal overlays (`MODAL_OVERLAY` CSS string) | `Dialog` component |
| Custom select dropdowns | [Select](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/AddUserModal.jsx#122-132) component |
| Custom toggle switches (Settings) | `Switch` component |
| Custom tabs (Timetable class/teacher) | `Tabs` component |
| Custom toast messages | `Sonner` (toast) |
| Custom data tables (UsersPage) | `DataTable` + `Table` |
| Custom input fields ([InputField](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/AddUserModal.jsx#6-16) component) | [Input](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/AddUserModal.jsx#6-16) + [Label](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Notice.jsx#52-56) |
| Custom loading spinners | `Skeleton` / `Spinner` |
| Custom dropdown menus | `DropdownMenu` component |
| Custom badges (role badges) | `Badge` component |

---

## 8. Proposed New Folder Structure

```
src/
├── app/
│   ├── App.jsx                    ← Routes + providers
│   ├── routes.jsx                 ← Route config (dynamic, not duplicated)
│   └── providers.jsx              ← Redux + QueryClient providers
│
├── components/
│   ├── ui/                        ← shadcn components (Button, Dialog, etc.)
│   │   ├── button.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── select.jsx
│   │   ├── table.jsx
│   │   ├── tabs.jsx
│   │   ├── switch.jsx
│   │   ├── badge.jsx
│   │   ├── skeleton.jsx
│   │   ├── dropdown-menu.jsx
│   │   └── sonner.jsx             ← Toast notifications
│   │
│   ├── layout/                    ← Global layout components
│   │   ├── DashboardLayout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   └── AvatarDropdown.jsx
│   │
│   └── shared/                    ← Reusable non-ui components
│       ├── ProtectedRoute.jsx
│       ├── RequireFeature.jsx
│       └── PageLoader.jsx
│
├── features/                      ← Feature-based modules
│   ├── auth/
│   │   ├── api.js                 ← API functions
│   │   ├── queries.js             ← TanStack Query hooks
│   │   ├── auth-slice.js          ← Redux slice (auth is special - needs Redux)
│   │   ├── use-auth.js            ← Hook bridging Redux + Query
│   │   └── index.js               ← Public exports
│   │
│   ├── users/
│   │   ├── api.js
│   │   ├── queries.js
│   │   ├── components/
│   │   │   ├── AddUserModal.jsx       ← Moved from components/
│   │   │   ├── UserDetailModal.jsx    ← Moved from components/users/
│   │   │   ├── UsersTable.jsx         ← Extracted from UsersPage
│   │   │   ├── UserFilters.jsx        ← Extracted from UsersPage
│   │   │   └── BulkActionsBar.jsx     ← Extracted from UsersPage
│   │   ├── UsersPage.jsx              ← Slim page ~100 lines, composes above
│   │   └── index.js
│   │
│   ├── timetable/
│   │   ├── api.js                     ← ONE api file (delete src/api/timetable.js)
│   │   ├── queries.js                 ← ONE TanStack hooks file
│   │   ├── components/
│   │   │   ├── TimetableGrid.jsx      ← Moved from components/timetable/
│   │   │   ├── TimetableModal.jsx
│   │   │   ├── CreateTimetableDialog.jsx ← Extracted from page
│   │   │   └── TeacherScheduleView.jsx
│   │   ├── TimetablePage.jsx          ← Slim page
│   │   └── index.js
│   │
│   ├── notices/
│   │   ├── api.js
│   │   ├── queries.js
│   │   ├── components/
│   │   │   ├── NoticeComposer.jsx     ← Extracted from Notice.jsx
│   │   │   ├── NoticeHistory.jsx
│   │   │   ├── RecipientPicker.jsx
│   │   │   └── NoticeFilters.jsx
│   │   ├── NoticePage.jsx
│   │   └── index.js
│   │
│   ├── settings/
│   │   ├── api.js
│   │   ├── queries.js                 ← USE these instead of raw api calls
│   │   ├── components/
│   │   │   ├── ThemeSelector.jsx
│   │   │   ├── LogoUploader.jsx
│   │   │   ├── FeatureToggles.jsx
│   │   │   └── LivePreview.jsx
│   │   ├── SettingsPage.jsx
│   │   └── index.js
│   │
│   ├── attendance/
│   │   ├── api.js
│   │   ├── queries.js
│   │   ├── components/
│   │   │   └── StudentHistoryModal.jsx
│   │   ├── AttendancePage.jsx
│   │   └── index.js
│   │
│   ├── calendar/
│   │   ├── api.js                     ← NEW - extract from page
│   │   ├── queries.js                 ← NEW - proper TanStack hooks
│   │   ├── components/
│   │   │   ├── CalendarGrid.jsx
│   │   │   └── EventForm.jsx
│   │   ├── CalendarPage.jsx
│   │   └── index.js
│   │
│   └── dashboard/
│       ├── api.js
│       ├── queries.js
│       ├── components/
│       │   └── StatCards.jsx
│       ├── DashboardPage.jsx
│       └── index.js
│
├── store/                         ← Redux store only
│   ├── store.js
│   ├── ui-slice.js
│   └── theme-slice.js
│
├── lib/                           ← Utilities & config
│   ├── axios.js                   ← Single axios instance
│   ├── query-client.js
│   └── utils.js                   ← shadcn cn() helper
│
├── hooks/                         ← Global hooks only
│   └── use-sidebar.js
│
├── main.jsx
└── index.css                      ← Tailwind + shadcn theme vars
```

### Key structural changes

1. **Delete** [src/api/timetable.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/timetable.js), [src/api/school.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/school.js), [src/api/axios.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/axios.js) (legacy re-export) — all API calls live in their feature module
2. **Delete** [src/hooks/useTimetableData.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js) — replaced by TanStack Query hooks in `features/timetable/queries.js`
3. **Delete** `src/pages/` directory — each page lives inside its feature
4. **Move** all feature-specific components from `src/components/` into their feature's  `components/` folder
5. **Add** `src/components/ui/` for shadcn components

---

## 9. Priority Action Items (Users + Timetable only)

Since changes are scoped to **users** and **timetable** modules only:

### Critical (Must fix)

1. **Delete [src/hooks/useTimetableData.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js)** and **[src/api/timetable.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/api/timetable.js)** — use TanStack hooks from [features/timetable/api/queries.js](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js) instead
2. **Refactor [Timetable.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Timetable.jsx)** to use TanStack Query hooks ([useTimetables](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js#47-54), [useTimeSlots](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js#15-22), [useMySchedule](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/features/timetable/api/queries.js#114-121), etc.) instead of [useTimetableData](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/hooks/useTimetableData.js#6-358)
3. **Move [TimetableGrid.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/timetable/TimetableGrid.jsx) and [TimetableModal.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/timetable/TimetableModal.jsx)** from `src/components/timetable/` into `src/features/timetable/components/`
4. **Extract create-timetable modal** from [Timetable.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/Timetable.jsx) into its own `CreateTimetableDialog.jsx` component

### Important

5. **Move [AddUserModal.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/AddUserModal.jsx)** from `src/components/` into `src/features/users/components/`
6. **Move [UserDetailModal.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/components/users/UserDetailModal.jsx)** from `src/components/users/` into `src/features/users/components/`
7. **Extract table, filters, bulk actions** from [UsersPage.jsx](file:///e:/Projects/Full%20Stack%20Project/Protap/School-Management-System/frontend/src/pages/UsersPage.jsx) into separate components
8. **Fix route duplication** — use `/:role/users`, `/:role/timetable` patterns instead of 3x manual entries

### Nice to have

9. **Install shadcn/ui** and start replacing hand-built primitives (modals → Dialog, toggles → Switch, etc.)
10. **Add shadcn Sonner** for toast notifications (replace manual `setMessage` toast patterns across pages)
