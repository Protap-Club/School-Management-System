# Project.md — School Management System (By Protap Club)

> **Purpose of this file:** This is the **single source of truth** for any developer or AI agent working on this project. Read this before writing any code. It explains what the project is, how it works, the architecture decisions, platform rules, and coding conventions used throughout the codebase.

---

## 1. What Is This Project?

A **multi-tenant School Management System / CRM** built for managing multiple schools from a single platform. It provides role-based access across **two platforms** (Web & Mobile) with per-school feature toggling, branding, and complete data isolation between schools.

**Organization:** Protap Club  
**Database Name:** `Protap` (hardcoded in `backend/src/index.js`)  
**API Base URL:** `/api/v1`

---

## 2. Platforms & Role Access Rules

The system is served on **two platforms**. Platform detection is done in **`auth.middleware.js`** via the `x-platform` HTTP header sent by the client.

| Platform | Allowed Roles                           | Notes                                           |
|----------|----------------------------------------|------------------------------------------------|
| **Web**  | Super Admin, Admin, Teacher            | Full dashboard, management, and settings        |
| **Mobile** | Teacher, Student                     | Limited feature set for on-the-go use           |

### Platform Detection Logic (Backend)

```
// In auth.middleware.js
const platform = req.headers["x-platform"];
req.platform = platform === "mobile" ? "mobile" : "web";

// Mobile Role Guard — blocks admin/super_admin on mobile
const MOBILE_ALLOWED_ROLES = [USER_ROLES.TEACHER, USER_ROLES.STUDENT];
if (req.platform === "mobile" && !MOBILE_ALLOWED_ROLES.includes(req.user.role)) {
    throw new ForbiddenError("Admin access is not available on mobile");
}
```

There is also a **`checkWebOnly`** middleware that blocks specific routes from being accessed on mobile entirely (used after `checkAuth`).

### CORS Allowed Origins

```
origin: ['http://localhost:5173', 'http://localhost:8081']
```

- `5173` = Vite web frontend
- `8081` = Mobile app (React Native / Expo)
- Custom headers allowed: `x-platform`, `x-device-key`

---

## 3. User Roles & Hierarchy

Defined in `backend/src/constants/userRoles.js`.

```
super_admin  (Level 4) — Highest power within a school (think: developer/owner representative)
    └── admin        (Level 3) — School principal, manages their school
        └── teacher      (Level 2) — Manages students, attendance
            └── student      (Level 1) — End user, managed by others
```

### Role Rules

| Role         | Scope             | Can Create                    | Can See Other Schools? |
|-------------|-------------------|-------------------------------|----------------------|
| `super_admin` | Own school only   | Admins, Teachers, Students, toggle features | ❌ No                |
| `admin`      | Own school only    | Teachers, Students             | ❌ No                |
| `teacher`    | Own school only    | Students (in some flows)       | ❌ No                |
| `student`    | Own school only    | Nothing                        | ❌ No                |

> **⚠️ Critical:** Super Admin is **NOT** a global/cross-school role. Each super admin identity (email) is tied to exactly one school. If the system has 5 schools, there are 5 separate super admin accounts — one per school. A super admin logged in with `viraj@nv.com` can only see and manage Navrachna International School, not any other school.

### Key Rule: School-Based Data Isolation

**Every role belongs to exactly one school via `schoolId`.** A user belonging to School A **cannot see, modify, or interact with** any data from School B. This applies to **all roles including `super_admin`**. This is enforced by:

1. **`school.middleware.js`** (`extractSchoolId`) — extracts and normalizes `req.schoolId` from the authenticated user.
2. **Service-layer queries** — all data queries filter by `schoolId` to ensure tenant isolation.

### Super Admin — How It Actually Works

- **Is tied to one school** via `schoolId`, just like all other roles.
- Think of super admin as: "us (the developers / Protap team)" acting on behalf of a specific school.
- Is created by developers (via seed scripts or direct DB insertion) **when a new school is onboarded**.
- **One school = one super admin identity.** If we onboard 3 schools, we create 3 super admin accounts.
- Super admin can: toggle features on/off, manage all users (admins, teachers, students) **within their school only**.
- Example from seed data: `viraj@nv.com` (super_admin) → tied to "Navrachna International School" → can only see/manage Navrachna data.
- When no `schoolId` is present (edge case), default "Protap" branding is returned as fallback.

---

## 4. Feature Modules (Toggle System)

Each school can have features **enabled or disabled** by the Super Admin. These are stored as boolean flags in the `School.features` subdocument.

Defined in `backend/src/constants/featureFlags.js`:

| Feature Key   | Label                   | Description                              |
|--------------|------------------------|------------------------------------------|
| `attendance` | Attendance Management   | Track student attendance via NFC          |
| `fees`       | Fee Management          | Manage student fees and payments          |
| `timetable`  | Timetable               | Class and exam schedules                  |
| `library`    | Library Management      | Book inventory and borrowing              |
| `transport`  | Transport Management    | Bus routes and tracking                   |
| `notice`     | Notice Board            | School announcements and notifications    |
| `calendar`   | Calendar                | Calendar events                           |

### How Feature Gating Works

1. **Backend:** `feature.middleware.js` (`requireFeature("attendance")`) checks if the user's school has the feature enabled before allowing access to that module's routes.
2. **Frontend:** `useHasFeature("attendance")` hook (in `frontend/src/state/features.js`) queries school features and conditionally renders UI elements.
3. **Database:** `School.model.js` has a `features` subdocument with each key defaulting to `false`.

---

## 5. Architecture Overview

### Backend Architecture

```
Express.js REST API (Node.js v18+, ES Modules)
    ├── Middleware Pipeline: CORS → cookieParser → JSON parser → Logger → Routes → Error Handler
    ├── Auth: JWT (access + refresh tokens), bcryptjs hashing
    ├── Database: MongoDB (Mongoose ODM v9)
    ├── File Uploads: Multer → Cloudinary CDN
    ├── Email: Nodemailer (SMTP)
    ├── Validation: Zod schemas
    ├── Logging: Pino + pino-pretty
    ├── Real-time: Socket.io (for live attendance updates)
    └── Entry Point: backend/src/index.js
```

### Frontend Architecture

```
React 19 + Vite 6 (ES Modules)
    ├── State: Redux Toolkit (global UI/theme) + TanStack React Query (server state/caching)
    ├── Styling: TailwindCSS v4
    ├── Routing: React Router DOM v7
    ├── HTTP: Axios (with interceptors in lib/axios)
    ├── Animations: Framer Motion
    ├── Real-time: Socket.io-client
    ├── Icons: React Icons
    └── Entry Point: frontend/src/main.jsx
```

---

## 6. Backend Module Structure (Convention)

Each feature is a **self-contained module** inside `backend/src/module/`:

```
backend/src/module/
├── auth/               # Authentication (login, token check)
│   ├── auth.controller.js
│   ├── auth.route.js
│   ├── auth.service.js
│   └── auth.validation.js
├── user/               # User CRUD, profiles, archival
│   ├── model/
│   │   ├── User.model.js
│   │   ├── AdminProfile.model.js
│   │   ├── TeacherProfile.model.js
│   │   └── StudentProfile.model.js
│   ├── user.controller.js
│   ├── user.route.js
│   ├── user.service.js
│   └── user.validation.js
├── school/             # School CRUD, branding, feature toggles
├── attendence/         # NFC-based attendance tracking  (note: "attendence" spelling in codebase)
├── fees/               # Fee management
├── timetable/          # Class/exam schedules
├── notice/             # School announcements
└── calendar/           # Calendar events
```

### Module Pattern (for each module)

| File                    | Responsibility                                                    |
|------------------------|-------------------------------------------------------------------|
| `*.model.js`            | Mongoose schema & model definition                                |
| `*.validation.js`       | Zod schemas for request body validation                           |
| `*.service.js`          | Business logic (DB queries, data transformations, no req/res)     |
| `*.controller.js`       | HTTP layer (parse req, call service, send res via `asyncHandler`) |
| `*.route.js`            | Express router with middleware chain per endpoint                 |

### Adding a New Module Checklist

1. Create folder `backend/src/module/<module-name>/`
2. Create the 5 files following the pattern above
3. Register routes in `backend/src/routes/index.route.js`
4. If feature-gated, add key to `SCHOOL_FEATURES` in `backend/src/constants/featureFlags.js`
5. Add boolean field to `School.model.js` → `features` subdocument
6. Use `requireFeature("<key>")` middleware in route file

---

## 7. Middleware Pipeline

All middleware lives in `backend/src/middlewares/`. Execution order matters.

| Middleware                  | File                       | Purpose                                                      |
|----------------------------|----------------------------|--------------------------------------------------------------|
| **`checkAuth`**            | `auth.middleware.js`        | JWT verification, user lookup, platform detection, mobile role guard |
| **`checkRole(roles[])`**   | `role.middleware.js`        | Restricts endpoint to specific roles                         |
| **`extractSchoolId`**      | `school.middleware.js`      | Normalizes `req.schoolId` from authenticated user             |
| **`requireFeature(key)`**  | `feature.middleware.js`     | Checks if school has the feature enabled                     |
| **`checkWebOnly`**         | `checkWebOnly.js`           | Blocks route access on mobile platform                       |
| **`validate(schema)`**     | `validation.middleware.js`  | Validates request body/query/params with Zod                 |
| **`upload`**               | `upload.middleware.js`      | Multer + Cloudinary file upload handling                     |
| **`errorHandler`**         | `error.middleware.js`       | Global error handler (must be last `app.use()`)              |

### Typical Route Middleware Chain

```javascript
router.post(
    "/create",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),  // Role check
    extractSchoolId,                                          // School context
    validate(createUserSchema),                               // Input validation
    userController.createUser                                 // Handler
);
```

---

## 8. Data Models & Profiles

### Core Models

| Model               | File                                      | Purpose                            |
|---------------------|-------------------------------------------|-------------------------------------|
| `User`              | `module/user/model/User.model.js`          | Base user (all roles)               |
| `School`            | `module/school/School.model.js`            | School entity with features & theme |
| `AdminProfile`      | `module/user/model/AdminProfile.model.js`  | Admin-specific fields               |
| `TeacherProfile`    | `module/user/model/TeacherProfile.model.js`| Teacher-specific fields             |
| `StudentProfile`    | `module/user/model/StudentProfile.model.js`| Student-specific fields             |
| `Attendance`        | `module/attendence/Attendance.model.js`    | Attendance records                  |
| `Fee`               | `module/fees/Fee.model.js`                 | Fee records                         |
| `Timetable`         | `module/timetable/Timetable.model.js`      | Timetable schedules                 |
| `Notice`            | `module/notice/Notice.model.js`            | Announcements                       |
| `Calendar`          | `module/calendar/calendar.model.js`        | Calendar events                     |

### Profile System

Profiles are **separate collections** linked to `User` via `userId` (1-to-1). The mapping is defined in `backend/src/constants/profileConfig.js`:

- **`admin`** → `AdminProfile` (fields: department, employeeId, permissions)
- **`teacher`** → `TeacherProfile` (fields: employeeId, standard, section, qualification, joiningDate)
- **`student`** → `StudentProfile` (fields: rollNumber, standard, year, section, guardianName, guardianContact, address, admissionDate)

`super_admin` does **not** have a profile document.

### Profile Helpers

```javascript
getProfileModel(role)          // Returns the Mongoose model for a role
getRequiredFields(role)        // Returns required fields array
extractProfileFields(role, data) // Merges defaults + extracts from request data
```

---

## 9. File Uploads (Cloudinary)

**All file uploads go through Cloudinary**, not local storage. Configured in `backend/src/config/cloudinary.js`.

- **Upload middleware:** `backend/src/middlewares/upload.middleware.js` uses `multer-storage-cloudinary`
- **Logo uploads:** Stored with `logoUrl` (CDN URL) and `logoPublicId` (for deletion) on the School model
- **Static resources:** The `/resource` endpoint serves local static files (e.g., `protap.png` brand asset) from `backend/resource/`

---

## 10. Frontend Structure

```
frontend/src/
├── api/                 # Axios interceptors and API config
├── assets/              # Static images, icons
├── components/          # Shared reusable components (14 files)
├── config/              # App config constants
├── data/                # Static data files
├── features/            # Feature-specific hooks, services, components
│   ├── auth/            # Login, auth hooks
│   ├── dashboard/       # Dashboard widgets
│   ├── attendance/      # Attendance feature
│   ├── users/           # User management feature
│   ├── notices/         # Notice board feature
│   ├── timetable/       # Timetable feature
│   └── settings/        # School settings & branding
├── hooks/               # Shared custom hooks
├── layouts/             # Dashboard layout wrapper
├── lib/                 # Utility libraries (axios instance, etc.)
├── pages/               # Route page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── UsersPage.jsx
│   ├── Attendance.jsx
│   ├── Timetable.jsx
│   ├── Notice.jsx
│   ├── Calendar.jsx
│   ├── Settings.jsx
│   └── Notifications.jsx
├── routes/              # Route definitions
├── state/               # Redux store, slices, React Query
│   ├── store.js         # Redux store config
│   ├── themeSlice.js    # Theme/branding state
│   ├── uiSlice.js       # UI state (sidebar, modals)
│   ├── features.js      # Feature flag queries (TanStack Query)
│   ├── hooks.js         # Custom state hooks
│   ├── providers.jsx    # Provider wrappers
│   └── index.js         # Barrel export
├── types/               # Type definitions
├── utils/               # Utility functions
├── App.jsx              # Root component with routes
├── main.jsx             # Entry point (renders App)
└── index.css            # Global styles (Tailwind base)
```

### State Management Strategy

- **Redux Toolkit** — Global UI state (theme, sidebar, modals) via `themeSlice.js` and `uiSlice.js`
- **TanStack React Query** — Server state (data fetching, caching, mutations) for all API data
- These two are **separate concerns** and should stay that way

---

## 11. Routes (API Endpoints)

Registered in `backend/src/routes/index.route.js`:

| Route Prefix       | Module         | Auth Required? | Notes                                          |
|--------------------|--------------|--------------|-------------------------------------------------|
| `/api/v1/auth`     | Auth          | ❌ Public     | Login, token check                              |
| `/api/v1/attendance`| Attendance   | 🔑 Device key | NFC device endpoint, own auth (before global checkAuth) |
| `/api/v1/users`    | User          | ✅ JWT        | CRUD, archival, profiles                        |
| `/api/v1/school`   | School        | ✅ JWT        | CRUD, branding, feature toggles                 |
| `/api/v1/notices`  | Notice        | ✅ JWT        | Announcements                                   |
| `/api/v1/calendar` | Calendar      | ✅ JWT        | Calendar events                                 |
| `/api/v1/timetables`| Timetable    | ✅ JWT        | Schedules                                       |
| `/api/v1/fees`     | Fees          | ✅ JWT        | Fee management                                  |

---

## 12. Authentication Flow

1. **Login:** `POST /api/v1/auth/login` with email + password → returns JWT access token + user data
2. **Token:** JWT includes `{ id: userId }`, verified in `checkAuth` middleware
3. **Refresh Tokens:** Supported (config has `JWT_REFRESH_SECRET`)
4. **First Login:** Users created with `mustChangePassword: true` — forced to change password on first login
5. **Password:** Hashed with `bcryptjs`, utilities in `backend/src/utils/password.util.js`

---

## 13. Environment Variables

### Backend (`backend/.env`)

```bash
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=<mongodb_connection_string>

# JWT
JWT_SECRET=<strong_random_key>
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=<another_strong_key>
REFRESH_TOKEN_EXPIRE=30d

# Super Admin (seed)
SUPER_ADMIN_EMAIL=<email>
SUPER_ADMIN_PASSWORD=<password>

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app_specific_password>
SMTP_FROM=<from_display>

# Cloudinary (Required for file uploads)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
```

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 14. Development Setup (Quick Start)

```bash
# 1. Clone & navigate
git clone <repo-url>
cd School-Management-System

# 2. Backend
cd backend
npm install
cp .env.example .env    # Fill in your values
npm run dev             # Starts on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.sample .env     # Fill in API URL
npm run dev             # Starts on http://localhost:5173

# 4. Seed database (optional)
cd backend
node src/seed/seed.js
```

---

## 15. Key Conventions & Patterns

### Backend

- **ES Modules** (`"type": "module"` in package.json) — use `import/export`, not `require`
- **Async error handling** — all controllers wrapped in `asyncHandler` (no try/catch in controllers)
- **Custom errors** — `customError.js` defines `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, etc.
- **Response utility** — `response.util.js` for consistent API response format
- **Logging** — Pino logger (`config/logger.js`), never use `console.log`
- **Validation** — Zod schemas in `*.validation.js` files, applied via `validate()` middleware
- **No direct DB access in controllers** — always go through service layer

### Frontend

- **Feature-based organization** — each feature has its own folder with hooks, API calls, and components
- **React Query for server state** — never store server data in Redux
- **Redux for UI state only** — theme, sidebar state, modals
- **Axios interceptors** — handle auth token injection and error handling centrally

### Naming

- Backend module folder names match their feature key (e.g., `timetable/`, `fees/`)
- ⚠️ **Known typo:** The attendance module folder is spelled `attendence/` (without the 'a') — do not rename, keep consistent
- Model files use PascalCase (`User.model.js`, `School.model.js`)
- Route/service/controller files use camelCase (`auth.service.js`)

---

## 16. Real-Time Features (Socket.io)

- **Backend:** `socket.js` initializes Socket.io on the HTTP server, stored on `app.set('io', io)`
- **Frontend:** Uses `socket.io-client` for real-time communication
- **Current use:** Live attendance updates from NFC devices
- **Access in handlers:** `req.app.get('io')` to emit events from controllers

---

## 17. Email System

- **Service:** `backend/src/utils/email.util.js`
- **Provider:** Nodemailer with SMTP (Gmail by default)
- **Templates:** HTML email templates for welcome emails with credentials
- **Behavior:** Email failure does **not** block user creation (graceful fallback)
- **Triggered on:** New user creation (sends login credentials)

---

## 18. Things to Keep in Mind

1. **School isolation is sacred** — Never write a query that leaks data across schools. Always filter by `schoolId` for **ALL** roles including `super_admin`. Every user is scoped to one school.
2. **Platform detection is in auth middleware** — The `x-platform` header is the source of truth. Always send it from clients.
3. **Feature flags are per-school** — Don't assume a feature is available. Always gate with `requireFeature()` on backend and `useHasFeature()` on frontend.
4. **Super Admin IS scoped to a school** — Each super admin identity belongs to one school. Don't treat super_admin as a global/cross-school role. The only difference is higher power level (can toggle features, manage all user types) within that school.
5. **Profiles are separate collections** — Don't try to embed profile data in the User model. Use the profile config system.
6. **Cloudinary for all uploads** — Don't save files locally. Always use the Cloudinary upload middleware.
7. **Express v5** — This project uses Express 5.x (not 4.x). Be aware of breaking changes.
8. **Mongoose v9** — Uses Mongoose 9.x with `lean()` for read performance.
