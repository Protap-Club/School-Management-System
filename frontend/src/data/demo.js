/**
 * ═══════════════════════════════════════════════════════════════
 * DEMO DATA - School Management System
 * ═══════════════════════════════════════════════════════════════
 * 
 * ALL users use password: Demo@123
 * Email pattern: name@schoolcode.com
 * 
 * CREDENTIALS:
 * ══════════════════════════════════════════════════════════════
 * 
 * DELHI PUBLIC SCHOOL (DPS):
 * - Super Admin: vraj@dps.com / Demo@123
 * - Admin: rajesh@dps.com / Demo@123
 * - Teachers: priya@dps.com (10th-A), amit@dps.com (10th-B), etc.
 * - Students: aarav@dps.com, ananya@dps.com, etc.
 * 
 * DAV PUBLIC SCHOOL (DAV):
 * - Super Admin: vraj@dav.com / Demo@123
 * - Admin: sunita@dav.com / Demo@123
 * - Teachers: rajesh.m@dav.com (9th-A), meena@dav.com (9th-B), etc.
 * - Students: aakash@dav.com, shruti@dav.com, etc.
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// SCHOOLS
// ═══════════════════════════════════════════════════════════════

export const DEMO_SCHOOLS = [
  {
    name: "Delhi Public School Dwarka",
    code: "DPS",
    address: "Sector 3, Dwarka, New Delhi 110078",
    contactPhone: "+91-11-2508-1717"
  },
  {
    name: "DAV Public School",
    code: "DAV",
    address: "Pushpanjali Enclave, Pitampura, New Delhi 110034",
    contactPhone: "+91-11-2734-5678"
  }
];

// ═══════════════════════════════════════════════════════════════
// DPS USERS
// ═══════════════════════════════════════════════════════════════

const DPS_ADMINS = [
  { name: "Rajesh Kumar", email: "rajesh@dps.com", department: "Administration", employeeId: "DPS-ADM-001" }
];

const DPS_TEACHERS = [
  { name: "Priya Sharma", email: "priya@dps.com", standard: "10th", section: "A", employeeId: "DPS-TCH-001" },
  { name: "Amit Verma", email: "amit@dps.com", standard: "10th", section: "B", employeeId: "DPS-TCH-002" },
  { name: "Neha Gupta", email: "neha@dps.com", standard: "11th", section: "A", employeeId: "DPS-TCH-003" },
  { name: "Rahul Singh", email: "rahul@dps.com", standard: "11th", section: "B", employeeId: "DPS-TCH-004" },
  { name: "Kavita Patel", email: "kavita@dps.com", standard: "12th", section: "A", employeeId: "DPS-TCH-005" },
  { name: "Vikram Reddy", email: "vikram@dps.com", standard: "12th", section: "B", employeeId: "DPS-TCH-006" },
  { name: "Sunita Iyer", email: "sunita.i@dps.com", standard: "9th", section: "A", employeeId: "DPS-TCH-007" },
  { name: "Arjun Malhotra", email: "arjun@dps.com", standard: "9th", section: "B", employeeId: "DPS-TCH-008" }
];

const DPS_STUDENTS = [
  // 10th A - Students for Priya
  { name: "Aarav Sharma", email: "aarav@dps.com", rollNumber: "DPS2024001", standard: "10th", section: "A", year: 2024 },
  { name: "Ananya Verma", email: "ananya@dps.com", rollNumber: "DPS2024002", standard: "10th", section: "A", year: 2024 },
  { name: "Vihaan Gupta", email: "vihaan@dps.com", rollNumber: "DPS2024003", standard: "10th", section: "A", year: 2024 },
  { name: "Diya Singh", email: "diya@dps.com", rollNumber: "DPS2024004", standard: "10th", section: "A", year: 2024 },
  // 10th B - Students for Amit
  { name: "Arjun Patel", email: "arjun.p@dps.com", rollNumber: "DPS2024005", standard: "10th", section: "B", year: 2024 },
  { name: "Saanvi Reddy", email: "saanvi@dps.com", rollNumber: "DPS2024006", standard: "10th", section: "B", year: 2024 },
  { name: "Reyansh Iyer", email: "reyansh@dps.com", rollNumber: "DPS2024007", standard: "10th", section: "B", year: 2024 },
  { name: "Isha Malhotra", email: "isha@dps.com", rollNumber: "DPS2024008", standard: "10th", section: "B", year: 2024 },
  // 11th A
  { name: "Aditya Nair", email: "aditya@dps.com", rollNumber: "DPS2024009", standard: "11th", section: "A", year: 2024 },
  { name: "Kavya Chopra", email: "kavya@dps.com", rollNumber: "DPS2024010", standard: "11th", section: "A", year: 2024 },
  // 11th B
  { name: "Rohan Kumar", email: "rohan@dps.com", rollNumber: "DPS2024011", standard: "11th", section: "B", year: 2024 },
  { name: "Riya Mehta", email: "riya@dps.com", rollNumber: "DPS2024012", standard: "11th", section: "B", year: 2024 },
  // 12th A
  { name: "Karan Joshi", email: "karan@dps.com", rollNumber: "DPS2024013", standard: "12th", section: "A", year: 2024 },
  { name: "Ayesha Shah", email: "ayesha@dps.com", rollNumber: "DPS2024014", standard: "12th", section: "A", year: 2024 },
  // 12th B  
  { name: "Vivaan Agarwal", email: "vivaan@dps.com", rollNumber: "DPS2024015", standard: "12th", section: "B", year: 2024 },
  { name: "Priya Roy", email: "priya.r@dps.com", rollNumber: "DPS2024016", standard: "12th", section: "B", year: 2024 }
];

// ═══════════════════════════════════════════════════════════════
// DAV USERS
// ═══════════════════════════════════════════════════════════════

const DAV_ADMINS = [
  { name: "Sunita Kapoor", email: "sunita@dav.com", department: "Administration", employeeId: "DAV-ADM-001" }
];

const DAV_TEACHERS = [
  { name: "Rajesh Mishra", email: "rajesh.m@dav.com", standard: "9th", section: "A", employeeId: "DAV-TCH-001" },
  { name: "Meena Pandey", email: "meena@dav.com", standard: "9th", section: "B", employeeId: "DAV-TCH-002" },
  { name: "Suresh Joshi", email: "suresh@dav.com", standard: "10th", section: "A", employeeId: "DAV-TCH-003" },
  { name: "Anjali Agarwal", email: "anjali@dav.com", standard: "10th", section: "B", employeeId: "DAV-TCH-004" },
  { name: "Manoj Bhatt", email: "manoj@dav.com", standard: "11th", section: "A", employeeId: "DAV-TCH-005" },
  { name: "Pooja Desai", email: "pooja@dav.com", standard: "11th", section: "B", employeeId: "DAV-TCH-006" }
];

const DAV_STUDENTS = [
  // 9th A
  { name: "Aakash Sharma", email: "aakash@dav.com", rollNumber: "DAV2024001", standard: "9th", section: "A", year: 2024 },
  { name: "Shruti Verma", email: "shruti@dav.com", rollNumber: "DAV2024002", standard: "9th", section: "A", year: 2024 },
  { name: "Dhruv Gupta", email: "dhruv@dav.com", rollNumber: "DAV2024003", standard: "9th", section: "A", year: 2024 },
  // 9th B
  { name: "Tanvi Singh", email: "tanvi@dav.com", rollNumber: "DAV2024004", standard: "9th", section: "B", year: 2024 },
  { name: "Kabir Patel", email: "kabir@dav.com", rollNumber: "DAV2024005", standard: "9th", section: "B", year: 2024 },
  // 10th A
  { name: "Navya Reddy", email: "navya@dav.com", rollNumber: "DAV2024006", standard: "10th", section: "A", year: 2024 },
  { name: "Arnav Iyer", email: "arnav@dav.com", rollNumber: "DAV2024007", standard: "10th", section: "A", year: 2024 },
  // 10th B
  { name: "Palak Malhotra", email: "palak@dav.com", rollNumber: "DAV2024008", standard: "10th", section: "B", year: 2024 },
  { name: "Siddharth Nair", email: "siddharth@dav.com", rollNumber: "DAV2024009", standard: "10th", section: "B", year: 2024 },
  // 11th A
  { name: "Kiara Chopra", email: "kiara@dav.com", rollNumber: "DAV2024010", standard: "11th", section: "A", year: 2024 },
  // 11th B
  { name: "Yash Kumar", email: "yash@dav.com", rollNumber: "DAV2024011", standard: "11th", section: "B", year: 2024 }
];

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const DEMO_USERS = {
  DPS: {
    admins: DPS_ADMINS,
    teachers: DPS_TEACHERS,
    students: DPS_STUDENTS
  },
  DAV: {
    admins: DAV_ADMINS,
    teachers: DAV_TEACHERS,
    students: DAV_STUDENTS
  }
};

export default { DEMO_SCHOOLS, DEMO_USERS };
