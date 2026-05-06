# 🎓 School Management System

A comprehensive, production-ready, full-stack web application designed to manage multiple schools with role-based access control, user management, attendance tracking, timetable management, examinations, results, fee management, and real-time notifications.

![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-7.0-green.svg)
![Socket.io](https://img.shields.io/badge/socket.io-4.8.3-black.svg)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [Installation & Setup](#-installation--setup)
- [Database Seeding](#-database-seeding)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🌟 Overview

The **School Management System** is a modern, feature-rich web application built to streamline educational institution management. It provides a centralized platform for managing multiple schools, users (super admins, administrators, teachers, students, and proxies), attendance tracking, academic management, financial operations, and real-time communications.

### **Core Concept**

This system implements a **multi-tenant architecture** where:
- A **Super Admin** can manage multiple schools from a single platform with full system access
- Each **School Admin** manages their own school's staff, students, and operations
- **Teachers** can track attendance, manage examinations, assignments, and view student information
- **Students** can access the mobile app to view attendance, fees, results, and assignments
- **Proxies** (parents/guardians) can access limited student information via mobile

---

## ✨ Key Features

### 🔐 **Authentication & Security**
- JWT-based authentication with access and refresh tokens
- Role-based access control (RBAC) with 5 user roles
- Secure password hashing using bcryptjs
- Rate limiting protection (1000 req/min dev, 100 req/min prod)
- Content Security Policy (CSP) with report-only/enforce modes
- Helmet.js security headers
- Force password change on first login
- Password reset via email
- Request correlation IDs for distributed tracing

### 👥 **User Management**
- Hierarchical user creation (Super Admin → Admin → Teacher → Student)
- Soft delete (archive) with restore functionality
- Permanent deletion (only for archived users)
- Bulk operations (archive/delete multiple users)
- Pagination, search, and filtering by role/school/class
- Automated welcome emails with credentials
- Profile management for all user types
- Audit logging for all user actions

### 🏫 **School Management**
- Create and manage multiple schools
- Unique school codes and contact information
- Cloudinary-powered logo upload and storage
- Customizable theme colors per school
- Track user counts per school (admins, teachers, students)
- School-specific data isolation

### 📊 **Attendance System**
- NFC-enabled attendance marking for physical devices
- Manual attendance marking via web interface
- Real-time attendance statistics with Socket.io
- Daily, monthly, and yearly attendance reports
- Absence tracking with penalty system integration
- Student-specific attendance history
- Export attendance data to Excel/PDF

### 📅 **Timetable Management**
- Create and manage time slots
- Class-wise timetable scheduling
- Teacher-specific timetable views
- Subject allocation and management
- Timetable conflict detection

### 📆 **Calendar & Events**
- School holiday management
- Event scheduling and notifications
- Exam schedules integration
- Academic calendar management

### 📢 **Notice Board**
- Create and publish school notices
- Role-based notice visibility
- Attachment support via Cloudinary
- Notice categorization and priority

### 📝 **Assignments**
- Create and manage class assignments
- Due date tracking with auto-expiry
- Assignment submission tracking
- Grade/feedback management

### 📚 **Examination & Results**
- Examination scheduling (class tests, term exams)
- Multiple exam types support
- Marks entry and result generation
- Gaussian distribution for realistic marks
- Student report card generation
- Pass/fail determination with grade calculation
- Historical result tracking

### 💰 **Fee Management**
- Fee structure configuration (tuition, admission, transport, etc.)
- Student fee assignment generation
- Payment recording and tracking
- Fee type and penalty type management
- Student penalty system for late payments
- Class-wise and school-wide fee overviews
- Yearly fee summaries and reports
- Outstanding fee tracking

### 💵 **Salary Management**
- Teacher salary entry and tracking
- Monthly salary status management
- Salary payment history
- Teacher-specific salary views

### 👨‍👩‍👧 **Proxy Management**
- Parent/guardian account creation
- Student-proxy linking
- Limited mobile access for viewing student data
- Proxy approval workflow

### 📱 **Real-time Features**
- Socket.io for real-time notifications
- Live attendance updates
- Instant notice notifications
- Event reminders and alerts

### 🎨 **Branding & Customization**
- Per-school logo customization via Cloudinary
- Theme color selection from predefined palettes
- Dynamic UI theming based on school branding
- Default "Protap" branding for Super Admin

### 📧 **Email & Communications**
- SMTP-based email service
- HTML email templates
- Automated credential delivery for new users
- Password reset emails
- Welcome emails with login instructions

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5.x
- **Database**: MongoDB 7.x with Mongoose ODM 9.x
- **Authentication**: JWT (access + refresh tokens)
- **Security**: bcryptjs, helmet, express-rate-limit, CSP
- **Email**: Nodemailer with SMTP
- **File Upload**: Multer + Cloudinary
- **Real-time**: Socket.io 4.x
- **Validation**: Zod schema validation
- **Logging**: Pino with pretty printing
- **Compression**: gzip via compression middleware

### **Frontend**
- **Library**: React 19.2.0
- **Build Tool**: Vite 6.4.1
- **Styling**: TailwindCSS 4.1.18
- **Routing**: React Router DOM 7.11.0
- **HTTP Client**: Axios 1.13.2
- **State Management**: Redux Toolkit + React Redux
- **Data Fetching**: TanStack React Query 5.x
- **UI Components**: Radix UI + Base UI React
- **Icons**: Lucide React + React Icons
- **Animations**: Framer Motion
- **Export**: ExcelJS, jsPDF, jspdf-autotable
- **Toast Notifications**: react-hot-toast

### **Development & Testing**
- **Backend Testing**: Vitest 3.x
- **Frontend Testing**: Vitest + jsdom + React Testing Library
- **Linting**: ESLint 9.x
- **Hot Reload**: Nodemon (backend), Vite HMR (frontend)

### **Deployment**
- **Containerization**: Docker
- **Orchestration**: Kubernetes (GKE)
- **Cloud Platform**: Google Cloud Platform
- **CDN**: Cloudinary for file storage

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  React 19 + Vite + TailwindCSS                                          │ │
│  │  - Redux Toolkit (Global State)                                         │ │
│  │  - TanStack Query (Server State)                                        │ │
│  │  - Protected Routes with Role-based Access                             │ │
│  │  - Axios HTTP Client with interceptors                                  │ │
│  │  - Socket.io Client for real-time updates                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ HTTPS/JWT + Socket.io
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Express.js REST API                                                   │ │
│  │  - Helmet Security Headers                                             │ │
│  │  - Rate Limiting (100-1000 req/min based on method)                    │ │
│  │  - Content Security Policy                                              │ │
│  │  - CORS Configuration                                                    │ │
│  │  - Request Correlation IDs                                              │ │
│  │  - Gzip Compression                                                     │ │
│  │  - JWT Auth Middleware                                                  │ │
│  │  - Role-based Permission Middleware                                     │ │
│  │  - Zod Validation Middleware                                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BUSINESS LOGIC LAYER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │   Auth     │ │   User     │ │   School   │ │Attendance  │ │ Timetable │ │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │ │  Service  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │   Fees     │ │Examination │ │  Result    │ │Assignment  │ │   Proxy   │ │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │ │  Service  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │   Notice   │ │  Calendar  │ │   Audit    │ │   Email    │               │ │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │               │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  MongoDB + Mongoose ODM                                                  │ │
│  │  - Users Collection (with soft delete support)                          │ │
│  │  - Schools Collection (multi-tenant data isolation)                     │ │
│  │  - Profile Collections (Admin, Teacher, Student)                        │ │
│  │  - Attendance, Timetable, Examination, Results                          │ │
│  │  - Fee Structures, Assignments, Payments, Penalties                   │ │
│  │  - Notices, Calendar Events, Audit Logs, Proxies                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐         │
│  │   Cloudinary     │ │   SMTP Server    │ │   Socket.io      │         │
│  │  (File Storage)  │ │  (Email Service) │ │  (Real-time)     │         │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & Permissions

### **Role Hierarchy**

```
Super Admin (Global Access)
    ├── Admin (School-Level)
    │   ├── Teacher (Department-Level)
    │   │   ├── Student (End User - Mobile Access)
    │   │   └── Proxy (Parent/Guardian - Mobile Access)
```

### **1. Super Admin** 🔑
- **Access Level**: Global (all schools)
- **Capabilities**:
  - Create, update, and delete schools
  - Manage all users across all schools
  - Access audit logs for entire system
  - Configure system-wide settings
  - View all financial reports
  - Manage proxy approvals
- **Default Login**: Uses "Protap" branding

### **2. Admin** 👔
- **Access Level**: School-specific
- **Capabilities**:
  - Manage teachers and students within their school
  - Customize school branding (logo & theme)
  - Manage timetable, notices, calendar
  - Configure fee structures and record payments
  - View school-specific audit logs
  - Manage examinations and results
  - Create and manage assignments
- **Limitations**: Cannot access other schools' data

### **3. Teacher** 📚
- **Access Level**: School-specific
- **Capabilities**:
  - View students in their school
  - Mark and manage student attendance
  - View and manage timetables
  - View examination schedules and results
  - Create and grade assignments
  - View own salary information
- **Limitations**: Cannot create/delete users, cannot manage fees

### **4. Student** 🎓
- **Access Level**: Mobile app only
- **Capabilities**:
  - View own attendance record
  - View fee status and payment history
  - View examination results and report cards
  - View assignments and due dates
  - View timetable
  - Receive notifications

### **5. Proxy** 👨‍👩‍👧
- **Access Level**: Mobile app only (linked to student)
- **Capabilities**:
  - View linked student's attendance
  - View linked student's fees
  - View linked student's results
  - View linked student's timetable
- **Limitations**: Read-only access, cannot modify data

---

## 🚀 Installation & Setup

### **Prerequisites**
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- SMTP credentials (for email functionality)
- Cloudinary account (for file uploads)
- Git

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd School-Management-System
```

### **2. Backend Setup**

```bash
cd backend

# Install dependencies
npm install

# Create environment file (see Environment Variables section)
# Edit .env with your configuration

# Start development server
npm run dev

# Or start production server
npm start

# Run tests
npm test
```

Backend runs on `http://localhost:5000`

### **3. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Create environment file (optional)
# Edit .env with your configuration

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

Frontend runs on `http://localhost:5173`

---

## 🌱 Database Seeding

The project includes a comprehensive CLI-based seeding system for testing and development.

### **Available Seed Commands**

```bash
cd backend

# Show all available commands
node src/seed/index.js help

# Run all seeds (recommended for fresh setup)
node src/seed/index.js seed-all

# Individual seed commands (run in order)
node src/seed/index.js seed-school        # Create schools
node src/seed/index.js seed-users         # Create users
node src/seed/index.js seed-profiles      # Create profiles
node src/seed/index.js seed-timetable     # Create timetables
node src/seed/index.js seed-attendance    # Create attendance records
node src/seed/index.js seed-calendar      # Create calendar events
node src/seed/index.js seed-notices       # Create notices
node src/seed/index.js seed-assignments   # Create assignments
node src/seed/index.js seed-examinations  # Create examinations
node src/seed/index.js seed-results       # Generate results
node src/seed/index.js seed-financials    # Create fee/salary data

# Cleanup (removes all seeded data)
node src/seed/index.js cleanup
```

### **Seeded Schools**
- **JNV** - Jawahar Navodaya Vidyalaya
- **NV** - Navrachna International School
- **NVV** - Nalanda Vishwavidyalay

### **Default Passwords**
- All seeded users: `School@123`
- Create your own Super Admin using: `node create_super_admin.js`

---

## 🌐 API Documentation

### **Base URL**
```
http://localhost:5000/api/v1
```

### **Authentication Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | ❌ |
| POST | `/auth/refresh` | Refresh access token | ❌ (requires refresh cookie) |
| POST | `/auth/logout` | User logout | ✅ |
| POST | `/auth/forgot-password` | Request password reset | ❌ |
| POST | `/auth/reset-password/:token` | Reset password with token | ❌ |
| PUT | `/auth/update-password` | Change password | ✅ |
| GET | `/auth/check` | Check auth status | ✅ |
| GET | `/auth/me` | Get current user | ✅ |

### **User Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/users` | Get all users (paginated, filtered) | Super Admin, Admin, Teacher |
| GET | `/users/:id` | Get user by ID | Super Admin, Admin, Teacher |
| POST | `/users` | Create new user | Super Admin, Admin |
| PUT | `/users/:id` | Update user | Super Admin, Admin |
| PUT | `/users/:id/archive` | Archive user | Super Admin, Admin |
| PUT | `/users/archive-bulk` | Archive multiple users | Super Admin, Admin |
| PUT | `/users/:id/restore` | Restore archived user | Super Admin, Admin |
| DELETE | `/users/:id` | Delete user permanently | Super Admin, Admin |
| DELETE | `/users/delete-bulk` | Delete multiple users | Super Admin, Admin |
| GET | `/users/archived` | Get archived users | Super Admin, Admin |

### **School Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/school` | Get all schools | Super Admin, Admin |
| POST | `/school` | Create school | Super Admin |
| GET | `/school/:id` | Get school by ID | Super Admin, Admin |
| PUT | `/school/:id` | Update school | Super Admin |
| DELETE | `/school/:id` | Delete school | Super Admin |
| POST | `/school/logo` | Upload school logo | Super Admin, Admin |
| DELETE | `/school/logo` | Delete school logo | Super Admin, Admin |
| PUT | `/school/theme` | Update theme color | Super Admin, Admin |
| GET | `/school/my-branding` | Get current school branding | All |

### **Attendance Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/attendance` | Get attendance records | Super Admin, Admin, Teacher |
| POST | `/attendance` | Mark attendance | Super Admin, Admin, Teacher |
| GET | `/attendance/student/:id` | Get student attendance | Super Admin, Admin, Teacher |
| GET | `/attendance/my-attendance` | Get own attendance (students) | Student |

### **Timetable Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/timetables` | Get timetables | All |
| POST | `/timetables` | Create timetable | Super Admin, Admin |
| PUT | `/timetables/:id` | Update timetable | Super Admin, Admin |
| DELETE | `/timetables/:id` | Delete timetable | Super Admin, Admin |

### **Examination & Results Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/examinations` | Get examinations | All |
| POST | `/examinations` | Create examination | Super Admin, Admin |
| GET | `/results` | Get results | All |
| POST | `/results` | Create/Update results | Super Admin, Admin |
| GET | `/results/student/:id` | Get student results | All |
| GET | `/results/my-results` | Get own results (students) | Student |

### **Fee Management Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/fees/structures` | Get fee structures | Super Admin, Admin |
| POST | `/fees/structures` | Create fee structure | Super Admin, Admin |
| POST | `/fees/structures/:id/generate` | Generate fee assignments | Super Admin, Admin |
| PATCH | `/fees/assignments/:id` | Update fee assignment | Super Admin, Admin |
| POST | `/fees/assignments/:id/pay` | Record payment | Super Admin, Admin |
| GET | `/fees/my-fees` | Get own fees (students) | Student |

### **Notice Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/notices` | Get notices | All |
| POST | `/notices` | Create notice | Super Admin, Admin |
| PUT | `/notices/:id` | Update notice | Super Admin, Admin |
| DELETE | `/notices/:id` | Delete notice | Super Admin, Admin |

### **Calendar Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/calendar` | Get calendar events | All |
| POST | `/calendar` | Create event | Super Admin, Admin |
| PUT | `/calendar/:id` | Update event | Super Admin, Admin |
| DELETE | `/calendar/:id` | Delete event | Super Admin, Admin |

### **Assignment Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/assignments` | Get assignments | All |
| POST | `/assignments` | Create assignment | Super Admin, Admin, Teacher |
| PUT | `/assignments/:id` | Update assignment | Super Admin, Admin, Teacher |
| DELETE | `/assignments/:id` | Delete assignment | Super Admin, Admin, Teacher |

### **Proxy Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/proxies` | Get all proxies | Super Admin, Admin |
| POST | `/proxies` | Create proxy | Super Admin, Admin |
| PUT | `/proxies/:id/approve` | Approve proxy | Super Admin, Admin |
| DELETE | `/proxies/:id` | Reject/delete proxy | Super Admin, Admin |

### **Audit Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/audit` | Get audit logs | Super Admin |
| GET | `/audit/user/:id` | Get user audit trail | Super Admin |

### **Authentication Header**
All protected endpoints require a JWT token:
```
Authorization: Bearer <access-token>
```

---

## 🗃️ Database Schema

### **Core Collections**

**User Collection**
```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  email: String,                   // Required, unique
  password: String,                // Hashed with bcrypt
  role: String,                    // super_admin | admin | teacher | student
  schoolId: ObjectId,              // Reference to School
  contactNo: String,
  isEmailVerified: Boolean,
  isActive: Boolean,
  isArchived: Boolean,             // Soft delete flag
  archivedAt: Date,
  archivedBy: ObjectId,
  mustChangePassword: Boolean,     // Force password change
  lastLoginAt: Date,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**School Collection**
```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  code: String,                    // Required, unique, uppercase
  address: String,
  contactEmail: String,
  contactPhone: String,
  logoUrl: String,                 // Cloudinary URL
  theme: {
    accentColor: String            // Hex color code
  },
  isActive: Boolean,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Profile Collections** (AdminProfile, TeacherProfile, StudentProfile)

**Attendance Collection**
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  schoolId: ObjectId,
  date: Date,
  status: String,                  // present | absent | late | leave
  markedBy: ObjectId,              // Teacher/Admin who marked
  markedVia: String,               // web | nfc | mobile
  remarks: String,
  createdAt: Date
}
```

**Fee Structure Collection**
```javascript
{
  _id: ObjectId,
  schoolId: ObjectId,
  name: String,                    // e.g., "Q1 Tuition Fee"
  standard: String,                  // Class/Grade
  section: String,
  year: Number,
  dueDate: Date,
  items: [{
    type: String,                  // tuition | admission | transport | etc.
    amount: Number
  }],
  totalAmount: Number,
  isActive: Boolean
}
```

---

## 🔧 Environment Variables

### **Backend (.env)**

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/school-management
DB_NAME=school-management

# JWT Secrets (use strong random strings)
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Super Admin Credentials
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=School Management <noreply@example.com>

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173
MOBILE_RESET_URL=myapp://reset-password

# Security
CSP_MODE=report-only              # report-only | enforce | off
CSP_REPORT_URI=/api/v1/security/csp-report

# Body Size Limits
JSON_BODY_LIMIT=1mb
TEXT_BODY_LIMIT=100kb

# Logging
LOG_LEVEL=info                    # debug | info | warn | error
```

### **Frontend (.env)**

```bash
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 📁 Project Structure

```
School-Management-System/
│
├── backend/
│   ├── src/
│   │   ├── config/              # Configuration (DB, logger, CSP, CORS)
│   │   ├── constants/           # User roles, app constants
│   │   ├── middlewares/           # Auth, role, validation, error handlers
│   │   ├── module/              # Feature modules
│   │   │   ├── assignment/      # Assignment management
│   │   │   ├── attendance/      # Attendance with NFC support
│   │   │   ├── audit/           # Audit logging
│   │   │   ├── auth/            # Authentication & password reset
│   │   │   ├── calendar/        # Calendar & events
│   │   │   ├── dashboard/       # Dashboard stats
│   │   │   ├── examination/     # Exams & scheduling
│   │   │   ├── fees/            # Fee management & penalties
│   │   │   ├── notice/          # Notice board
│   │   │   ├── proxy/           # Parent/guardian access
│   │   │   ├── result/          # Results & report cards
│   │   │   ├── school/          # School management
│   │   │   ├── timetable/       # Timetable management
│   │   │   ├── user/            # User management
│   │   │   └── security/        # CSP reporting
│   │   ├── routes/              # API route aggregation
│   │   ├── seed/                # Database seeding CLI
│   │   ├── utils/               # Utility functions
│   │   ├── index.js             # Express app entry
│   │   └── socket.js            # Socket.io configuration
│   ├── resource/                # Default static assets
│   ├── tests/                   # Backend tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios configuration
│   │   ├── assets/              # Static assets
│   │   ├── components/          # Shared UI components
│   │   ├── config/              # App configuration
│   │   ├── features/            # Feature-based modules
│   │   │   ├── assignment/
│   │   │   ├── attendance/
│   │   │   ├── auth/
│   │   │   ├── calendar/
│   │   │   ├── dashboard/
│   │   │   ├── examination/
│   │   │   ├── fees/
│   │   │   ├── notices/
│   │   │   ├── proxy/
│   │   │   ├── result/
│   │   │   ├── settings/
│   │   │   ├── timetable/
│   │   │   └── users/
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Page layouts
│   │   ├── lib/                 # Utility libraries
│   │   ├── routes/              # Route configuration
│   │   ├── state/               # Redux store & slices
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Helper functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/                   # Frontend tests
│   ├── Dockerfile
│   └── package.json
│
├── k8s/                         # Kubernetes manifests
│   ├── backend.yaml
│   └── frontend.yaml
├── .github/                     # GitHub Actions
├── README.md
└── vercel.json                  # Vercel deployment config
```

---

## 🔒 Security Features

### **Implemented Security Measures**

1. **Helmet.js** - Security headers (HSTS, CSP, X-Frame-Options, etc.)
2. **Rate Limiting** - 100-1000 requests per minute based on environment
3. **CORS** - Configured for specific origins only
4. **CSP (Content Security Policy)** - Report-only or enforce mode
5. **Input Sanitization** - Parameter sanitization middleware
6. **Zod Validation** - Schema validation for all inputs
7. **JWT Security** - Separate access and refresh tokens
8. **Password Security** - bcryptjs hashing with salt
9. **Request Correlation IDs** - For distributed tracing
10. **Audit Logging** - All user actions logged
11. **Graceful Shutdown** - Proper cleanup on termination
12. **Proxy Trust** - Correct client IP handling behind proxies

### **Best Practices**
- Never commit `.env` files
- Use strong JWT secrets (64+ characters)
- Enable HTTPS in production
- Use app-specific passwords for SMTP
- Regularly update dependencies
- Monitor rate limit headers
- Review CSP reports regularly

---

## 🚀 Deployment

### **Docker Deployment**

```bash
# Build backend image
cd backend
docker build -t school-mgmt-backend .

# Build frontend image
cd frontend
docker build -t school-mgmt-frontend .
```

### **Kubernetes Deployment (GKE)**

```bash
# Apply configurations
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# Check status
kubectl get pods
kubectl get services
```

### **Vercel Deployment**

The project includes `vercel.json` for serverless deployment:
```bash
# Using Vercel CLI
vercel
```

### **Environment-Specific Configuration**

| Variable | Development | Production |
|----------|-------------|------------|
| NODE_ENV | development | production |
| PORT | 5000 | 3000 (K8s) |
| RATE_LIMIT | 1000 req/min | 100 req/min |
| CSP_MODE | off/report-only | enforce |
| LOG_LEVEL | debug | info/warn |

---

## 🤝 Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Use conventional commit messages

---

<div align="center">

**Built by Protap**

</div>
