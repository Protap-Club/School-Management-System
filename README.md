# 🎓 School Management System

A comprehensive, full-stack web application designed to manage multiple schools with role-based access control, user management, attendance tracking, and customizable branding.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [Installation & Setup](#-installation--setup)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Features in Detail](#-features-in-detail)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Usage Guide](#-usage-guide)
- [Contributing](#-contributing)

---

## 🌟 Overview

The **School Management System** is a modern web application built to streamline educational institution management. It provides a centralized platform for managing multiple schools, users (administrators, teachers, and students), attendance tracking, and school-specific branding.

### **Core Concept**

This system implements a **multi-tenant architecture** where:
- A **Super Admin** can manage multiple schools from a single platform
- Each **School Admin** manages their own school's staff and students
- **Teachers** can track student attendance and manage student information
- **Students** have detailed profiles but cannot access the portal (managed by staff)

---

## ✨ Key Features

### 🔐 **Authentication & Authorization**
- JWT-based authentication with 7-day token expiry
- Role-based access control (RBAC) with 4 user roles
- Secure password hashing using bcryptjs
- Protected routes and API endpoints
- Force password change on first login

### 👥 **User Management**
- Hierarchical user creation and management
- Soft delete (archive) with restore functionality
- Permanent deletion (only for archived users)
- Bulk operations (select and manage multiple users)
- Pagination and filtering by role/school
- Automated welcome emails with credentials

### 🏫 **School Management**
- Create and manage multiple schools
- Unique school codes and contact information
- Custom logo upload for each school
- Customizable theme colors
- Track user counts per school (admins, teachers, students)

### 📊 **Attendance System**
- Date-based student attendance tracking
- Real-time attendance statistics
- Search and filter students
- Visual attendance dashboard
- Attendance reports

### 🎨 **Branding & Customization**
- Per-school logo customization
- Theme color selection from predefined palettes
- Dynamic UI theming based on school branding
- Default "Protap" branding for Super Admin

### 📧 **Email Notifications**
- SMTP-based email service
- Beautiful HTML email templates
- Automated credential delivery for new users
- Graceful fallback if email service fails

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: bcryptjs for password hashing
- **Email**: Nodemailer (SMTP)
- **File Upload**: Multer
- **CORS**: Cross-Origin Resource Sharing enabled

### **Frontend**
- **Library**: React 19.2.0
- **Build Tool**: Vite 6.4.1
- **Styling**: TailwindCSS 4.1.18
- **Routing**: React Router DOM 7.11.0
- **HTTP Client**: Axios 1.13.2
- **Icons**: React Icons 5.5.0
- **State Management**: Context API

### **Development Tools**
- **Backend**: Nodemon for hot-reloading
- **Frontend**: Vite HMR (Hot Module Replacement)
- **Linting**: ESLint

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React + Vite + TailwindCSS                         │   │
│  │  - Context API (Auth, Theme, Sidebar)               │   │
│  │  - Protected Routes                                  │   │
│  │  - Axios HTTP Client                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS/JWT
┌─────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express.js REST API                                │   │
│  │  - Auth Middleware (JWT Verification)               │   │
│  │  - Role Middleware (Permission Checking)            │   │
│  │  - Upload Middleware (File Handling)                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │    User      │  │   School     │     │
│  │  Service     │  │  Service     │  │  Service     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐                                           │
│  │   Email      │                                           │
│  │  Service     │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MongoDB + Mongoose                                 │   │
│  │  - Users Collection                                  │   │
│  │  - Schools Collection                                │   │
│  │  - AdminProfile Collection                           │   │
│  │  - TeacherProfile Collection                         │   │
│  │  - StudentProfile Collection                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles & Permissions

### **Role Hierarchy**

```
Super Admin (Global Access)
    ├── Admin (School-Level)
    │   ├── Teacher (Department-Level)
    │   │   └── Student (End User)
```

### **1. Super Admin** 🔑
- **Access Level**: Global (all schools)
- **Capabilities**:
  - Create, update, and delete schools
  - Manage admins, teachers, and students across all schools
  - View system-wide statistics
  - Access all features without school restrictions
- **Limitations**: No school assignment, uses default branding

### **2. Admin** 👔
- **Access Level**: School-specific
- **Capabilities**:
  - Manage teachers and students within their school
  - Customize school branding (logo & theme)
  - View school statistics
  - Archive/restore/delete users in their school
- **Limitations**: Cannot manage users in other schools

### **3. Teacher** 📚
- **Access Level**: School-specific, view-only for most features
- **Capabilities**:
  - View students in their school
  - Mark and manage student attendance
  - View attendance statistics
- **Limitations**: Cannot create/delete users

### **4. Student** 🎓
- **Access Level**: No portal access
- **Capabilities**: None (profile managed by teachers/admins)
- **Status**: Cannot login to the system
- **Use Case**: Data record for attendance and academic tracking

---

## 🚀 Installation & Setup

### **Prerequisites**
- Node.js (v18 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- SMTP credentials (for email functionality)
- Git

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd School-Management-System
```

### **2. Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration
# (See Environment Variables section below)

# Run in development mode
npm run dev

# Or run in production mode
npm start
```

The backend server will start on `http://localhost:5000`

### **3. Frontend Setup**

```bash
# Navigate to frontend directory (from root)
cd frontend

# Install dependencies
npm install

# Create environment file (if needed)
cp .env.sample .env

# Run in development mode
npm run dev

# Build for production
npm run build
```

The frontend will start on `http://localhost:5173`

### **4. Database Seeding (Optional)**

To populate the database with sample data:

```bash
cd backend
node src/seed/seed.js
```

This will create sample schools, users, and profiles for testing.

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
| GET | `/auth/check` | Check auth status | ✅ |

**Login Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "admin@example.com",
    "role": "admin",
    "schoolId": "507f1f77bcf86cd799439012"
  }
}
```

### **User Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/user/create-user` | Create new user | All authenticated |
| GET | `/user/get-users` | Get users (paginated) | Super Admin, Admin, Teacher |
| GET | `/user/get-users-with-profiles` | Get users with profiles | Super Admin, Admin, Teacher |
| PUT | `/user/archive/:id` | Archive a user | Super Admin, Admin |
| PUT | `/user/archive-bulk` | Archive multiple users | Super Admin, Admin |
| DELETE | `/user/delete/:id` | Permanently delete user | Super Admin, Admin |
| DELETE | `/user/delete-bulk` | Delete multiple users | Super Admin, Admin |
| PUT | `/user/restore/:id` | Restore archived user | Super Admin, Admin |
| GET | `/user/archived` | Get archived users | Super Admin, Admin |

**Create User Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "teacher",
  "schoolId": "507f1f77bcf86cd799439012",
  "contactNo": "+1234567890",
  "profileData": {
    "department": "Mathematics",
    "designation": "Senior Teacher"
  }
}
```

### **School Endpoints**

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/school/` | Get all schools | Super Admin, Admin |
| POST | `/school/` | Create school | Super Admin |
| GET | `/school/:id` | Get school by ID | Super Admin, Admin |
| PUT | `/school/:id` | Update school | Super Admin |
| DELETE | `/school/:id` | Delete school | Super Admin |
| GET | `/school/my-branding` | Get current school branding | All authenticated |
| POST | `/school/logo` | Upload school logo | Super Admin, Admin |
| DELETE | `/school/logo` | Delete school logo | Super Admin, Admin |
| PUT | `/school/theme` | Update school theme | Super Admin, Admin |

**Create School Request:**
```json
{
  "name": "Springfield High School",
  "code": "SHS001",
  "address": "123 Main St, Springfield",
  "contactEmail": "info@springfield.edu",
  "contactPhone": "+1234567890"
}
```

### **Authentication Header**
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🗃️ Database Schema

### **User Collection**
```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  email: String,                   // Required, unique, indexed
  password: String,                // Hashed, not returned in queries
  role: String,                    // Enum: super_admin, admin, teacher, student
  schoolId: ObjectId,              // Reference to School (optional for super_admin)
  contactNo: String,
  isEmailVerified: Boolean,        // Default: false
  isActive: Boolean,               // Default: true
  isArchived: Boolean,             // Default: false, indexed
  archivedAt: Date,
  archivedBy: ObjectId,            // Reference to User
  mustChangePassword: Boolean,     // Default: true
  lastLoginAt: Date,
  createdBy: ObjectId,             // Reference to User
  createdAt: Date,                 // Auto-generated
  updatedAt: Date                  // Auto-generated
}
```

### **School Collection**
```javascript
{
  _id: ObjectId,
  name: String,                    // Required
  code: String,                    // Required, unique, uppercase
  address: String,
  contactEmail: String,
  contactPhone: String,
  logoUrl: String,                 // Path to uploaded logo
  theme: {
    accentColor: String            // Default: #2563eb
  },
  isActive: Boolean,               // Default: true
  createdBy: ObjectId,             // Reference to User
  createdAt: Date,
  updatedAt: Date,
  
  // Virtual fields (computed)
  adminCount: Number,
  teacherCount: Number,
  studentCount: Number
}
```

### **AdminProfile Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                // Reference to User, unique
  permissions: [String],           // Array of permission strings
  department: String,
  employeeId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **TeacherProfile Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                // Reference to User, unique
  employeeId: String,
  department: String,              // Required
  designation: String,             // Required
  qualification: String,
  joiningDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **StudentProfile Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                // Reference to User, unique
  rollNumber: String,              // Required
  standard: String,                // Required (e.g., "10th", "Grade 5")
  year: Number,                    // Required (academic year)
  section: String,                 // Optional (e.g., "A", "B")
  guardianName: String,
  guardianContact: String,
  address: String,
  admissionDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Features in Detail

### **1. User Lifecycle Management**

#### **Creating Users**
1. Admin/Super Admin fills user creation form
2. System generates secure random password
3. User record created with `mustChangePassword: true`
4. Role-specific profile created (Admin/Teacher/Student)
5. Welcome email sent with credentials
6. User appears in user list

#### **Archiving Users (Soft Delete)**
1. User can be archived (moved to archive)
2. `isArchived` flag set to `true`
3. `archivedAt` timestamp recorded
4. `archivedBy` records who archived the user
5. User no longer appears in active user list
6. Can be restored later if needed

#### **Restoring Users**
1. Admin navigates to archived users
2. Selects user to restore
3. User's `isArchived` flag set to `false`
4. User reappears in active user list
5. All profile data preserved

#### **Permanent Deletion (Hard Delete)**
1. Only archived users can be permanently deleted
2. User record and associated profile deleted from database
3. Action cannot be undone
4. Bulk deletion supported

### **2. Multi-Tenant School System**

Each school operates independently:
- **Isolated Data**: Admins can only see/manage users in their school
- **Custom Branding**: Each school has its own logo and theme
- **Independent User Counts**: Statistics tracked per school
- **School Codes**: Unique identifiers for each institution

### **3. Email Service**

Automated email notifications with:
- HTML-formatted templates
- School/system branding
- Credentials delivery for new users
- Security warnings (change password reminder)
- Fallback mechanism (user created even if email fails)

### **4. File Upload System**

- Logo uploads stored in `/backend/uploads/logos/`
- Default resources in `/backend/resource/`
- Multer middleware for handling multipart/form-data
- File cleanup when logos are updated/deleted
- Static file serving via Express

---

## 📁 Project Structure

```
School-Management-System/
│
├── backend/
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   ├── constants/           # User roles, constants
│   │   ├── controllers/         # HTTP request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   └── school.controller.js
│   │   ├── middlewares/         # Auth, role, upload middlewares
│   │   │   ├── auth.middleware.js
│   │   │   ├── role.middleware.js
│   │   │   ├── upload.middleware.js
│   │   │   └── school.middleware.js
│   │   ├── models/              # Mongoose schemas
│   │   │   ├── User.model.js
│   │   │   ├── School.model.js
│   │   │   ├── AdminProfile.model.js
│   │   │   ├── TeacherProfile.model.js
│   │   │   └── StudentProfile.model.js
│   │   ├── routes/              # API routes
│   │   │   ├── auth.route.js
│   │   │   ├── user.route.js
│   │   │   └── school.route.js
│   │   ├── services/            # Business logic
│   │   │   ├── auth.service.js
│   │   │   ├── user.service.js
│   │   │   ├── school.service.js
│   │   │   └── email.service.js
│   │   ├── seed/                # Database seeding
│   │   ├── utils/               # Utility functions
│   │   └── index.js             # Entry point
│   ├── uploads/                 # User-uploaded files
│   ├── resource/                # Default resources
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios configuration
│   │   ├── assets/              # Images, icons
│   │   ├── components/          # Reusable React components
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── AddUserModal.jsx
│   │   │   └── AddSchoolModal.jsx
│   │   ├── context/             # Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   └── SidebarContext.jsx
│   │   ├── layouts/             # Layout components
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── SchoolsPage.jsx
│   │   │   ├── Attendance.jsx
│   │   │   └── Settings.jsx
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md                    # This file
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
# Or use MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/school-management

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SMTP Configuration (for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=School Management System <noreply@yourdomain.com>

# CORS
CORS_ORIGIN=http://localhost:5173
```

### **Frontend (.env)** *(Optional)*

```bash
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 📖 Usage Guide

### **First Time Setup**

1. **Create Super Admin Account** (via database seeding or manual insertion)
2. **Login as Super Admin**
3. **Create School(s)**
4. **Create School Admin(s)** and assign to schools
5. **School Admins create Teachers**
6. **Teachers/Admins create Students**

### **Common Workflows**

#### **As Super Admin:**
1. Login to the system
2. Navigate to Schools page
3. Create new school with details
4. Create admin account for the school
5. Admin receives email with credentials

#### **As School Admin:**
1. Login with delivered credentials
2. Change password on first login
3. Customize school branding (logo & theme)
4. Create teacher accounts
5. Manage students

#### **As Teacher:**
1. Login to the system
2. View student list
3. Mark attendance
4. View attendance reports

### **Bulk Operations**
1. Navigate to Users page
2. Click checkbox icon to enter selection mode
3. Select multiple users
4. Choose bulk action (archive/delete)
5. Confirm action

---

## 🔒 Security Best Practices

1. **Change Default Credentials**: Always change passwords on first login
2. **Use Strong JWT Secret**: Generate a random 64+ character secret
3. **HTTPS in Production**: Use SSL/TLS certificates
4. **Environment Variables**: Never commit `.env` files
5. **Regular Updates**: Keep dependencies updated
6. **MongoDB Security**: Use authentication and restrict network access
7. **SMTP Security**: Use app-specific passwords, not account passwords
8. **Role Validation**: Always verify user permissions on backend

---

## 🚧 Roadmap & Future Enhancements

- [ ] Student portal access with limited features
- [ ] Timetable management
- [ ] Grade/marks management
- [ ] Fee management and payment tracking
- [ ] Parent accounts with student linking
- [ ] SMS notifications
- [ ] Advanced reporting and analytics
- [ ] Calendar integration
- [ ] Assignment submission system
- [ ] Multi-language support
- [ ] Mobile application (React Native)
- [ ] Real-time notifications (WebSocket)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Authors & Acknowledgments

- **Protap Club** - Initial work and concept
- Built with ❤️ for educational institutions

---

## 📞 Support

For support, email support@protapclub.com or open an issue in the repository.

---

## 🙏 Acknowledgments

- Thanks to all contributors and testers
- Icons by [React Icons](https://react-icons.github.io/react-icons/)
- UI inspiration from modern educational platforms
- MongoDB for robust database solutions
- React and the amazing open-source community

---

<div align="center">

**Made with ❤️ for Schools**

⭐ Star this repo if you find it helpful!

</div>
