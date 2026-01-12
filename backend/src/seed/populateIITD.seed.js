/**
 * Populate IITD Seed Script
 * Usage: node src/seed/populateIITD.seed.js
 */

import { runSeed, SeedContext } from "../utils/seedRunner.util.js";
import {
    seedAdmins,
    seedTeachers,
    seedStudents
} from "./bulkUsers.seed.js";
import { findInstituteByCode, findSuperAdminByInstitute } from "../utils/seed.util.js";

const POPULATE_DATA = {
    instituteCode: "IITD",
    admin: {
        name: "Dean Of Academics",
        email: "dean.academics@iitd.ac.in",
        department: "Administration",
        employeeId: "ADM001",
        contactNo: "9876543210"
    },
    teachers: [
        { name: "Prof. Amit Sharma", email: "amit.sharma@iitd.ac.in", department: "Computer Science", designation: "Professor", employeeId: "CSE101", qualification: "Ph.D. AI/ML" },
        { name: "Dr. Priya Singh", email: "priya.singh@iitd.ac.in", department: "Electrical Engineering", designation: "Associate Professor", employeeId: "EE102", qualification: "Ph.D. Signal Processing" },
        { name: "Prof. Rajesh Kumar", email: "rajesh.kumar@iitd.ac.in", department: "Mechanical Engineering", designation: "HOD", employeeId: "ME103", qualification: "Ph.D. Thermodynamics" },
        { name: "Dr. Anjali Gupta", email: "anjali.gupta@iitd.ac.in", department: "Physics", designation: "Assistant Professor", employeeId: "PHY104", qualification: "Ph.D. Quantum Physics" },
        { name: "Prof. Suresh Reddy", email: "suresh.reddy@iitd.ac.in", department: "Civil Engineering", designation: "Professor", employeeId: "CE105", qualification: "Ph.D. Structural Engg" },
        { name: "Dr. Kavita Mehra", email: "kavita.mehra@iitd.ac.in", department: "Chemistry", designation: "Associate Professor", employeeId: "CH106", qualification: "Ph.D. Organic Chemistry" },
        { name: "Prof. Vikram Malhotra", email: "vikram.malhotra@iitd.ac.in", department: "Mathematics", designation: "Professor", employeeId: "MA107", qualification: "Ph.D. Number Theory" },
        { name: "Dr. Neha Verma", email: "neha.verma@iitd.ac.in", department: "Computer Science", designation: "Assistant Professor", employeeId: "CSE108", qualification: "Ph.D. Network Security" },
        { name: "Prof. Arjun Das", email: "arjun.das@iitd.ac.in", department: "Electrical Engineering", designation: "Professor", employeeId: "EE109", qualification: "Ph.D. Power Systems" },
        { name: "Dr. Ritu Kapoor", email: "ritu.kapoor@iitd.ac.in", department: "Humanities", designation: "Associate Professor", employeeId: "HU110", qualification: "Ph.D. Sociology" }
    ],
    students: [
        // Generated 50 realistic students across departments
        ...Array.from({ length: 15 }, (_, i) => ({
            name: `CS Student ${i + 1}`, email: `cs${2023001 + i}@iitd.ac.in`,
            rollNumber: `2023CS${10001 + i}`, course: "B.Tech", year: 2023, section: "A"
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
            name: `EE Student ${i + 1}`, email: `ee${2023001 + i}@iitd.ac.in`,
            rollNumber: `2023EE${10001 + i}`, course: "B.Tech", year: 2023, section: "B"
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
            name: `ME Student ${i + 1}`, email: `me${2023001 + i}@iitd.ac.in`,
            rollNumber: `2023ME${10001 + i}`, course: "B.Tech", year: 2023, section: "C"
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
            name: `M.Tech Student ${i + 1}`, email: `mt${2025001 + i}@iitd.ac.in`,
            rollNumber: `2025MT${10001 + i}`, course: "M.Tech", year: 2025, section: "PG"
        }))
    ]
};

const main = async () => {
    const ctx = new SeedContext("Populate IITD");
    const { instituteCode, admin, teachers, students } = POPULATE_DATA;

    ctx.log(`Target School: ${instituteCode}`);

    // Verify Institute Exists
    const institute = await findInstituteByCode(instituteCode);
    if (!institute) {
        ctx.log(`❌ Institute ${instituteCode} not found. Run schoolProvisioning first.`);
        return;
    }

    // Find SuperAdmin to set as creator
    const superAdmin = await findSuperAdminByInstitute(institute._id);
    const creatorId = superAdmin ? superAdmin._id : null;
    ctx.log(`Creator (SuperAdmin): ${superAdmin ? superAdmin.email : "System"}`);

    const options = { sendEmails: false, createdBy: creatorId };

    // 1. Create Admin
    ctx.log("\n--- Creating Admin ---");
    await seedAdmins(instituteCode, [admin], options);

    // 2. Create Teachers
    ctx.log("\n--- Creating Teachers ---");
    await seedTeachers(instituteCode, teachers, options);

    // 3. Create Students
    ctx.log("\n--- Creating Students ---");
    await seedStudents(instituteCode, students, options);

    ctx.log("\n✅ Population Complete!");
    return { success: true };
};

if (process.argv[1].includes("populateIITD.seed.js")) {
    runSeed("Populate IITD", main);
}

export default main;
