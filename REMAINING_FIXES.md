# Remaining Fixes — School Management System

## Context: What Happened

The database (MongoDB Atlas, database name: `Protap`) had 9 collections wiped clean by someone running the `cleanup` seed command (`node src/seed/index.js cleanup`). A recovery script (`backend/src/seed/recovery.js`) was run and successfully restored most data.

### Current Database State (after recovery)

| Collection            | Count | Status                                                                |
| --------------------- | ----- | --------------------------------------------------------------------- |
| `schools`             | 1     | ✅ OK                                                                 |
| `users`               | 1103  | ✅ OK (includes ~1080 students, 20 teachers, 2 admins, 1 super_admin) |
| `adminprofiles`       | 2     | ✅ OK                                                                 |
| `teacherprofiles`     | 20    | ✅ Restored                                                           |
| `timeslots`           | 8     | ✅ Restored                                                           |
| `timetables`          | 36    | ✅ Restored                                                           |
| `timetableentries`    | 155   | ✅ Restored                                                           |
| `calendarevents`      | 22    | ✅ Restored                                                           |
| `attendances`         | 70    | ✅ Restored                                                           |
| **`studentprofiles`** | **0** | ❌ **STILL BROKEN — NEEDS FIX**                                       |

### MongoDB Connection

```
URI: mongodb+srv://npandyavrajesh31_db_user:mfD737uBkSw8cLmn@management0.jaemc3r.mongodb.net/?appName=Management0
DB Name: Protap  (specified via { dbName: "Protap" } in mongoose.connect)
```

The connection string does NOT include the database name in the path — it's specified separately in code at `backend/src/index.js` line 92 and `backend/src/seed/lib/db.js` line 11.

---

## Issue 1: Student Profiles Not Seeded (CRITICAL)

### Problem

The `studentprofiles` collection has 0 documents. ~1080 students exist in the `users` collection with role `"student"`, but none have a corresponding `StudentProfile` document. This causes:

- **Users page**: Students show without profile data (no standard, section, rollNumber)
- **Attendance (teacher view)**: 500 error because `TeacherProfile.findOne().assignedClasses` maps to `StudentProfile.find()` which returns nothing
- **Timetable (student view)**: 500 error because `getUserTimetable()` calls `StudentProfile.findOne({ userId, schoolId })` which returns null

### Root Cause

The recovery script (`backend/src/seed/recovery.js`) tried to match students by generated email addresses, but the email generation pattern didn't match how the students were originally created by `seedUsers.js`.

### How Students Were Originally Created

File: `backend/src/seed/commands/seedUsers.js` (lines 43-65)

The seed system works like this:

1. `buildStudentRecords(usersData)` generates student objects with `fullName`, `email`, `standard`, `section`, `roll`
2. `seedUsers.js` creates `User` documents using `student.email` as the email
3. `seedProfiles.js` later looks up users by the same email to create `StudentProfile` documents

The function `buildStudentRecords` lives at `backend/src/seed/lib/studentRecords.js` (created during this recovery session — it did NOT exist before).

### The Fix

There are two approaches. Use whichever is simpler:

#### Approach A: Query-based (Recommended — no email matching needed)

Create student profiles by querying ALL users with `role: "student"` in the NV school, then distributing them across standards/sections. This avoids the fragile email-matching problem entirely.

```javascript
// In a script or directly in recovery.js:
const school = await School.findOne({ code: "NV" });
const students = await User.find({ schoolId: school._id, role: "student" })
  .select("_id name")
  .sort({ createdAt: 1 }) // Preserve original creation order
  .lean();

const sections = ["A", "B", "C"];
const studentsPerSection = 30;
let idx = 0;

for (let standard = 1; standard <= 12; standard++) {
  for (const section of sections) {
    for (let roll = 1; roll <= studentsPerSection; roll++) {
      if (idx >= students.length) break;
      const student = students[idx];
      await StudentProfile.create({
        userId: student._id,
        schoolId: school._id,
        rollNumber: `NV-${standard}${section}-${String(roll).padStart(2, "0")}`,
        standard: String(standard),
        section: section,
        year: 2026,
        admissionDate: new Date("2025-04-01"),
        fatherName: "Parent", // Placeholder
        motherName: "Parent", // Placeholder
        address: "Vadodara, Gujarat", // Placeholder
      });
      idx++;
    }
  }
}
console.log(`Created ${idx} student profiles`);
```

The above distributes ~1080 students across 12 standards × 3 sections × 30 per section = 1080 students.

#### Approach B: Fix the email matching in recovery.js

Debug why the emails don't match by:

1. Query 5 sample student emails from the DB: `db.collection('users').find({role:'student'}).limit(5).project({email:1})`
2. Compare with what `buildStudentRecords()` generates
3. Fix the email format in `backend/src/seed/lib/studentRecords.js` to match

### Files Involved

- `backend/src/seed/recovery.js` — the recovery script (modify the student profiles section)
- `backend/src/seed/lib/studentRecords.js` — email generation logic
- `backend/src/module/user/model/StudentProfile.model.js` — the model:

```javascript
// StudentProfile schema fields:
{
    userId: ObjectId (ref: "User", required),
    schoolId: ObjectId (ref: "School", required),
    rollNumber: String (required, unique per school),
    standard: String (required),  // "1", "2", ..., "12"
    section: String (required),   // "A", "B", "C"
    year: Number,                 // 2026
    admissionDate: Date,
    fatherName: String,
    fatherContact: String,
    motherName: String,
    motherContact: String,
    address: String,
}
```

### Verification

After fixing, run:

```bash
node -e "const m=require('mongoose');m.connect('mongodb+srv://npandyavrajesh31_db_user:mfD737uBkSw8cLmn@management0.jaemc3r.mongodb.net/Protap').then(async()=>{const c=await m.connection.db.collection('studentprofiles').countDocuments();console.log('studentprofiles:',c);await m.disconnect();})"
```

Expected: `studentprofiles: 1080` (or close to 1080)

---

## Issue 2: Dashboard Attendance Always Shows 0%

### Problem

The Dashboard page (`frontend/src/pages/Dashboard.jsx`) shows "0 out of X students present" and "0%" attendance rate, even when attendance records exist.

### Root Cause

In `Dashboard.jsx` lines 28-31, the code fetches users to get the total student count, but sets `present: 0`:

```javascript
// Line 30 — THIS IS THE BUG
setStats((prev) => ({ ...prev, total: users.length, present: 0 }));
```

The `present` count is ONLY updated via WebSocket events (line 52-53):

```javascript
socket.on("attendance-marked", () => {
  setStats((prev) => ({ ...prev, present: prev.present + 1 }));
});
```

This means if the page loads AFTER attendance was already marked, `present` stays at 0 forever.

### The Fix

After fetching the student count, also fetch today's attendance records from the `/attendance/today` endpoint and count the present students.

File: `frontend/src/pages/Dashboard.jsx`

Change the `fetchData` function (lines 21-46) to also fetch attendance:

```javascript
useEffect(() => {
  if (!isTeacher && !isAdmin) return;
  const fetchData = async () => {
    try {
      const endpoint = isAdmin
        ? "/users?role=student"
        : "/users?role=student&pageSize=100";
      const [mainRes, attendanceRes] = await Promise.all([
        api.get(endpoint),
        api.get("/attendance/today"),
      ]);
      if (mainRes.data.success) {
        const users = mainRes.data.data?.users || mainRes.data.data || [];
        // Count present from attendance response
        const attendanceData = attendanceRes.data?.data || [];
        const presentCount = Array.isArray(attendanceData)
          ? attendanceData.filter((r) => r.status === "Present").length
          : (attendanceData.students || []).filter(
              (s) => s.status === "Present",
            ).length;
        setStats({ total: users.length, present: presentCount });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };
  fetchData();
}, [user]);
```

### Important Notes

- The `/attendance/today` endpoint (GET) is defined at `backend/src/module/attendence/attendance.route.js` line 11
- For web platform, the attendance service returns an array of `{ studentId, status, checkInTime }` records (see `backend/src/module/attendence/attendence.service.js` lines 133-143)
- For teachers, the response shape is `{ students: [...] }` (lines 238-249)
- The teacher also needs `allRes` call removed — it was used for `teacherProfile` which is unrelated to attendance

---

## Issue 3: Null Safety in Backend Services

### Problem

When `TeacherProfile` or `StudentProfile` doesn't exist for a user, the backend crashes with 500 instead of returning a graceful error.

### Fix A: `backend/src/module/attendence/attendence.service.js`

In `getTeacherMobileAttendance` (line 194), add null check:

```javascript
// Line 194 — current code:
const teacherProfile = await TeacherProfile.findOne({
  userId: teacherUserId,
  schoolId,
})
  .select("assignedClasses")
  .lean();

// Line 198 — THIS IS FINE, already has null check:
if (!teacherProfile || !teacherProfile.assignedClasses?.length) {
  return { students: [] };
}
```

This function actually already handles null correctly. The issue only happens if the function throws before reaching this check. **No change needed here.**

### Fix B: `backend/src/module/user/user.service.js`

In `getUsers()` (lines 125-143), when `creator.role === 'teacher'`, it queries `TeacherProfile.findOne()`. If the teacher has no profile, `teacherProfile` is null. The code at line 130 checks `teacherProfile?.assignedClasses?.length`, so this is **already null-safe**.

**No change needed here either.** The 500 errors from these endpoints are caused by missing `StudentProfile` documents (issue #1), not by missing null checks. Once student profiles are restored, these endpoints will work.

---

## Summary of Required Actions

| Priority | Issue                | Action                                                                       |
| -------- | -------------------- | ---------------------------------------------------------------------------- |
| 🔴 P0    | Student profiles = 0 | Run Approach A script to create ~1080 StudentProfile documents               |
| 🟡 P1    | Dashboard shows 0%   | Edit `frontend/src/pages/Dashboard.jsx` to fetch `/attendance/today` on load |
| 🟢 P2    | Null safety          | Already handled — will resolve once student profiles exist                   |

## File Tree Reference

```
backend/
├── src/
│   ├── index.js                          # Line 92: mongoose.connect with dbName: "Protap"
│   ├── module/
│   │   ├── attendence/
│   │   │   ├── Attendance.model.js       # Attendance schema
│   │   │   ├── attendence.service.js     # getTodayAttendance, getTeacherMobileAttendance
│   │   │   ├── attendence.controller.js  # Route handlers
│   │   │   └── attendance.route.js       # GET /today, POST /nfc, etc.
│   │   ├── user/
│   │   │   ├── model/
│   │   │   │   ├── User.model.js         # User schema (1103 docs exist)
│   │   │   │   ├── StudentProfile.model.js # ← EMPTY, needs seeding
│   │   │   │   ├── TeacherProfile.model.js # 20 docs restored
│   │   │   │   └── AdminProfile.model.js   # 2 docs exist
│   │   │   └── user.service.js           # getUsers, getUserById
│   │   ├── timetable/                    # ✅ Restored
│   │   ├── calendar/                     # ✅ Restored
│   │   └── school/
│   │       └── School.model.js           # 1 school: NV, all features enabled
│   └── seed/
│       ├── recovery.js                   # Recovery script (already run)
│       ├── lib/
│       │   ├── db.js                     # DB connection helper
│       │   ├── loadJson.js               # JSON loader (created during recovery)
│       │   └── studentRecords.js         # Student builder (created during recovery)
│       └── new/
│           ├── users.json                # Seed data with studentConfig, namePools
│           ├── profiles.json             # Profile seed data
│           └── ...
frontend/
├── src/
│   ├── pages/
│   │   └── Dashboard.jsx                 # ← FIX: attendance rate always 0
│   ├── lib/
│   │   └── axios.js                      # Axios with refresh interceptor
│   └── features/
│       ├── timetable/                    # TimetablePage + tanstack queries
│       ├── users/                        # UsersPage + tanstack queries
│       └── auth/                         # AuthContext
```
