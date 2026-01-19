/**
 * ═══════════════════════════════════════════════════════════════
 * DEMO DATA - School Management System
 * ═══════════════════════════════════════════════════════════════
 * 
 * This file contains demo data for testing the application.
 * ALL users use the same password: Demo@123
 * 
 * Email Pattern: name@schoolname.com
 * 
 * CREDENTIALS SUMMARY:
 * ══════════════════════════════════════════════════════════════
 * 
 * DELHI PUBLIC SCHOOL (DPS):
 * - Super Admin: vraj@dps.com / Demo@123
 * - Admin: rajesh@dps.com / Demo@123
 * - Teachers: priya@dps.com, amit@dps.com, ... (10 total)
 * - Students: aarav@dps.com, ananya@dps.com, ... (20 total)
 * 
 * DAV PUBLIC SCHOOL (DAV):
 * - Super Admin: vraj@dav.com / Demo@123
 * - Admin: sunita@dav.com / Demo@123
 * - Teachers: rajesh.m@dav.com, meena@dav.com, ... (10 total)
 * - Students: aakash@dav.com, shruti@dav.com, ... (20 total)
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// SCHOOLS (with Super Admin details)
// ═══════════════════════════════════════════════════════════════

export const DEMO_SCHOOLS = [
    {
        name: "Delhi Public School Dwarka",
        code: "DPS",
        address: "Sector 3, Dwarka, New Delhi, Delhi 110078",
        contactPhone: "+91-11-2508-1717",
        contactEmail: "info@dps.com",
        superAdmin: {
            name: "Vraj",
            email: "vraj@dps.com"
        }
    },
    {
        name: "DAV Public School",
        code: "DAV",
        address: "Pushpanjali Enclave, Pitampura, New Delhi, Delhi 110034",
        contactPhone: "+91-11-2734-5678",
        contactEmail: "contact@dav.com",
        superAdmin: {
            name: "Vraj",
            email: "vraj@dav.com"
        }
    }
];

// ═══════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════════

const DEPARTMENTS = ["Mathematics", "Science", "English", "History", "Computer Science"];
const GRADES = ["9th", "10th", "11th", "12th"];
const SECTIONS = ["A", "B", "C", "D"];

// ═══════════════════════════════════════════════════════════════
// DELHI PUBLIC SCHOOL (DPS) USERS
// ═══════════════════════════════════════════════════════════════

const generateDPSAdmins = () => [
    {
        name: "Rajesh Kumar",
        email: "rajesh@dps.com",
        department: "Administration",
        employeeId: "DPS-ADM-001"
    }
];

const generateDPSTeachers = () => [
    { name: "Priya Sharma", email: "priya@dps.com", department: "Mathematics", designation: "Senior Teacher", employeeId: "DPS-TCH-001" },
    { name: "Amit Verma", email: "amit@dps.com", department: "Science", designation: "Teacher", employeeId: "DPS-TCH-002" },
    { name: "Neha Gupta", email: "neha@dps.com", department: "English", designation: "Teacher", employeeId: "DPS-TCH-003" },
    { name: "Rahul Singh", email: "rahul@dps.com", department: "History", designation: "Senior Teacher", employeeId: "DPS-TCH-004" },
    { name: "Kavita Patel", email: "kavita@dps.com", department: "Computer Science", designation: "Teacher", employeeId: "DPS-TCH-005" },
    { name: "Vikram Reddy", email: "vikram@dps.com", department: "Mathematics", designation: "Teacher", employeeId: "DPS-TCH-006" },
    { name: "Sunita Iyer", email: "sunita.i@dps.com", department: "Science", designation: "Teacher", employeeId: "DPS-TCH-007" },
    { name: "Arjun Malhotra", email: "arjun@dps.com", department: "English", designation: "Teacher", employeeId: "DPS-TCH-008" },
    { name: "Deepa Nair", email: "deepa@dps.com", department: "History", designation: "Teacher", employeeId: "DPS-TCH-009" },
    { name: "Sanjay Chopra", email: "sanjay@dps.com", department: "Computer Science", designation: "Senior Teacher", employeeId: "DPS-TCH-010" }
];

const generateDPSStudents = () => [
    { name: "Aarav Sharma", email: "aarav@dps.com", rollNumber: "DPS2024001", standard: "9th", section: "A", year: 2024 },
    { name: "Ananya Verma", email: "ananya@dps.com", rollNumber: "DPS2024002", standard: "9th", section: "A", year: 2024 },
    { name: "Vihaan Gupta", email: "vihaan@dps.com", rollNumber: "DPS2024003", standard: "9th", section: "B", year: 2024 },
    { name: "Diya Singh", email: "diya@dps.com", rollNumber: "DPS2024004", standard: "9th", section: "B", year: 2024 },
    { name: "Arjun Patel", email: "arjun.p@dps.com", rollNumber: "DPS2024005", standard: "10th", section: "A", year: 2024 },
    { name: "Saanvi Reddy", email: "saanvi@dps.com", rollNumber: "DPS2024006", standard: "10th", section: "A", year: 2024 },
    { name: "Reyansh Iyer", email: "reyansh@dps.com", rollNumber: "DPS2024007", standard: "10th", section: "B", year: 2024 },
    { name: "Isha Malhotra", email: "isha@dps.com", rollNumber: "DPS2024008", standard: "10th", section: "B", year: 2024 },
    { name: "Aditya Nair", email: "aditya@dps.com", rollNumber: "DPS2024009", standard: "11th", section: "A", year: 2024 },
    { name: "Kavya Chopra", email: "kavya@dps.com", rollNumber: "DPS2024010", standard: "11th", section: "A", year: 2024 },
    { name: "Rohan Kumar", email: "rohan@dps.com", rollNumber: "DPS2024011", standard: "11th", section: "B", year: 2024 },
    { name: "Riya Mehta", email: "riya@dps.com", rollNumber: "DPS2024012", standard: "11th", section: "B", year: 2024 },
    { name: "Karan Joshi", email: "karan@dps.com", rollNumber: "DPS2024013", standard: "12th", section: "A", year: 2024 },
    { name: "Ayesha Shah", email: "ayesha@dps.com", rollNumber: "DPS2024014", standard: "12th", section: "A", year: 2024 },
    { name: "Vivaan Agarwal", email: "vivaan@dps.com", rollNumber: "DPS2024015", standard: "12th", section: "B", year: 2024 },
    { name: "Priya Roy", email: "priya.r@dps.com", rollNumber: "DPS2024016", standard: "12th", section: "B", year: 2024 },
    { name: "Atharv Banerjee", email: "atharv@dps.com", rollNumber: "DPS2024017", standard: "9th", section: "C", year: 2024 },
    { name: "Nitya Ghosh", email: "nitya@dps.com", rollNumber: "DPS2024018", standard: "10th", section: "C", year: 2024 },
    { name: "Ishaan Das", email: "ishaan@dps.com", rollNumber: "DPS2024019", standard: "11th", section: "C", year: 2024 },
    { name: "Myra Bose", email: "myra@dps.com", rollNumber: "DPS2024020", standard: "12th", section: "C", year: 2024 }
];

// ═══════════════════════════════════════════════════════════════
// DAV PUBLIC SCHOOL (DAV) USERS
// ═══════════════════════════════════════════════════════════════

const generateDAVAdmins = () => [
    {
        name: "Sunita Kapoor",
        email: "sunita@dav.com",
        department: "Administration",
        employeeId: "DAV-ADM-001"
    }
];

const generateDAVTeachers = () => [
    { name: "Rajesh Mishra", email: "rajesh.m@dav.com", department: "Mathematics", designation: "Senior Teacher", employeeId: "DAV-TCH-001" },
    { name: "Meena Pandey", email: "meena@dav.com", department: "Science", designation: "Teacher", employeeId: "DAV-TCH-002" },
    { name: "Suresh Joshi", email: "suresh@dav.com", department: "English", designation: "Teacher", employeeId: "DAV-TCH-003" },
    { name: "Anjali Agarwal", email: "anjali@dav.com", department: "History", designation: "Senior Teacher", employeeId: "DAV-TCH-004" },
    { name: "Manoj Bhatt", email: "manoj@dav.com", department: "Computer Science", designation: "Teacher", employeeId: "DAV-TCH-005" },
    { name: "Pooja Desai", email: "pooja@dav.com", department: "Mathematics", designation: "Teacher", employeeId: "DAV-TCH-006" },
    { name: "Ashok Rao", email: "ashok@dav.com", department: "Science", designation: "Teacher", employeeId: "DAV-TCH-007" },
    { name: "Lakshmi Menon", email: "lakshmi@dav.com", department: "English", designation: "Teacher", employeeId: "DAV-TCH-008" },
    { name: "Vijay Kulkarni", email: "vijay@dav.com", department: "History", designation: "Teacher", employeeId: "DAV-TCH-009" },
    { name: "Rekha Saxena", email: "rekha@dav.com", department: "Computer Science", designation: "Senior Teacher", employeeId: "DAV-TCH-010" }
];

const generateDAVStudents = () => [
    { name: "Aakash Sharma", email: "aakash@dav.com", rollNumber: "DAV2024001", standard: "9th", section: "A", year: 2024 },
    { name: "Shruti Verma", email: "shruti@dav.com", rollNumber: "DAV2024002", standard: "9th", section: "A", year: 2024 },
    { name: "Dhruv Gupta", email: "dhruv@dav.com", rollNumber: "DAV2024003", standard: "9th", section: "B", year: 2024 },
    { name: "Tanvi Singh", email: "tanvi@dav.com", rollNumber: "DAV2024004", standard: "9th", section: "B", year: 2024 },
    { name: "Kabir Patel", email: "kabir@dav.com", rollNumber: "DAV2024005", standard: "10th", section: "A", year: 2024 },
    { name: "Navya Reddy", email: "navya@dav.com", rollNumber: "DAV2024006", standard: "10th", section: "A", year: 2024 },
    { name: "Arnav Iyer", email: "arnav@dav.com", rollNumber: "DAV2024007", standard: "10th", section: "B", year: 2024 },
    { name: "Palak Malhotra", email: "palak@dav.com", rollNumber: "DAV2024008", standard: "10th", section: "B", year: 2024 },
    { name: "Siddharth Nair", email: "siddharth@dav.com", rollNumber: "DAV2024009", standard: "11th", section: "A", year: 2024 },
    { name: "Kiara Chopra", email: "kiara@dav.com", rollNumber: "DAV2024010", standard: "11th", section: "A", year: 2024 },
    { name: "Yash Kumar", email: "yash@dav.com", rollNumber: "DAV2024011", standard: "11th", section: "B", year: 2024 },
    { name: "Tara Mehta", email: "tara@dav.com", rollNumber: "DAV2024012", standard: "11th", section: "B", year: 2024 },
    { name: "Advait Joshi", email: "advait@dav.com", rollNumber: "DAV2024013", standard: "12th", section: "A", year: 2024 },
    { name: "Sara Shah", email: "sara@dav.com", rollNumber: "DAV2024014", standard: "12th", section: "A", year: 2024 },
    { name: "Rudra Agarwal", email: "rudra@dav.com", rollNumber: "DAV2024015", standard: "12th", section: "B", year: 2024 },
    { name: "Nisha Roy", email: "nisha@dav.com", rollNumber: "DAV2024016", standard: "12th", section: "B", year: 2024 },
    { name: "Aryan Banerjee", email: "aryan@dav.com", rollNumber: "DAV2024017", standard: "9th", section: "C", year: 2024 },
    { name: "Sanya Ghosh", email: "sanya@dav.com", rollNumber: "DAV2024018", standard: "10th", section: "C", year: 2024 },
    { name: "Harsh Das", email: "harsh@dav.com", rollNumber: "DAV2024019", standard: "11th", section: "C", year: 2024 },
    { name: "Aditi Bose", email: "aditi@dav.com", rollNumber: "DAV2024020", standard: "12th", section: "C", year: 2024 }
];

// ═══════════════════════════════════════════════════════════════
// EXPORT DEMO USERS
// ═══════════════════════════════════════════════════════════════

export const DEMO_USERS = {
    DPS: {
        admins: generateDPSAdmins(),
        teachers: generateDPSTeachers(),
        students: generateDPSStudents()
    },
    DAV: {
        admins: generateDAVAdmins(),
        teachers: generateDAVTeachers(),
        students: generateDAVStudents()
    }
};

// Default password for ALL demo users (including super admin)
export const DEMO_PASSWORD = "Demo@123";

export default { DEMO_SCHOOLS, DEMO_USERS, DEMO_PASSWORD };
