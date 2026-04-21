import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import { FeeStructure, FeeAssignment, FeePayment } from "../../module/fees/Fee.model.js";
import Salary from "../../module/fees/Salary.model.js";
import logger from "../../config/logger.js";
import { getAcademicYear, getSchoolClassSections } from "../lib/generatedAcademicSeed.js";

const generateReceiptString = (num) => `RCPT-${String(num).padStart(6, "0")}`;

// Simple deterministic hash for procedural generation
const hashInt = (num) => {
    let t = num + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
};

const seedFinancials = async () => {
    logger.info("=== Seeding Financial Mock Data (Demo Only) ===");

    // We ONLY target the demo school: Nalanda Vishwavidyalay (NVV)
    const code = "NVV";
    const school = await School.findOne({ code });

    if (!school) {
        logger.warn(`School ${code} not found. Skipping financials.`);
        return;
    }

    // 🔥 CLEAN OLD DATA
    await FeePayment.deleteMany({ schoolId: school._id });
    await FeeAssignment.deleteMany({ schoolId: school._id });
    await FeeStructure.deleteMany({ schoolId: school._id });
    await Salary.deleteMany({ schoolId: school._id });

    // Ensure we have an admin
    const admin = await User.findOne({
        schoolId: school._id,
        role: { $in: ["admin", "super_admin"] },
    }).select("_id");

    if (!admin) {
        logger.warn(`No admin found for ${code}. Skipping financials.`);
        return;
    }

    const academicYear = getAcademicYear();
    const classSections = getSchoolClassSections(code);

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Setup Fee Structures & Assignments for Students
    // ─────────────────────────────────────────────────────────────────────────────
    const feeStructures = [];
    
    // We want randomized fees per class standard
    const stdFeeMap = new Map();

    const generateFeeForStandard = (std) => {
        const numericStd = parseInt(std, 10);
        let base = 0;
        if (numericStd <= 4) base = 1500;
        else if (numericStd <= 8) base = 2000;
        else if (numericStd <= 10) base = 2500;
        else base = 3000;
        
        // Add pseudo-random variance based on standard
        const variance = (hashInt(numericStd * 11) % 5) * 100; // 0, 100, 200, 300, 400
        return base + variance;
    };

    logger.info(`[${code}] Generating Fee Structures & Assignments...`);

    for (const cls of classSections) {
        let amount = stdFeeMap.get(cls.standard);
        if (!amount) {
            amount = generateFeeForStandard(cls.standard);
            stdFeeMap.set(cls.standard, amount);
        }

        feeStructures.push({
            schoolId: school._id,
            academicYear,
            standard: cls.standard,
            section: cls.section,
            feeType: "TUITION",
            name: "Monthly Tuition Fee",
            amount,
            frequency: "MONTHLY",
            dueDay: 10,
            applicableMonths: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3], // April - March
            isActive: true,
            createdBy: admin._id
        });
    }

    const insertedFeeStructures = await FeeStructure.insertMany(feeStructures);

    // Build map to lookup structure ID by standard-section
    const structureMap = new Map();
    insertedFeeStructures.forEach(fs => {
        structureMap.set(`${fs.standard}-${fs.section}`, fs);
    });

    // We will generate assignments for the last 3 months
    const date = new Date();
    const currentMonth = date.getMonth() + 1; // 1-12
    const monthsToSeed = [];
    for (let i = 0; i < 3; i++) {
        let m = currentMonth - i;
        if (m <= 0) m += 12;
        monthsToSeed.push(m);
    }

    // Get all students
    const students = await User.find({
        schoolId: school._id,
        role: "student"
    }).lean();

    const studentProfiles = await import("../../module/user/model/StudentProfile.model.js").then(m => m.default).catch(e => null);
    if (!studentProfiles) {
        logger.error("Could not load StudentProfile model for financials.");
        return;
    }

    const profiles = await studentProfiles.find({ schoolId: school._id }).lean();
    const profileMap = new Map();
    profiles.forEach(p => {
        profileMap.set(p.userId.toString(), p);
    });

    const assignments = [];
    
    // Distribute payments
    const payments = [];
    let receiptCounter = 1000;

    for (const student of students) {
        const profile = profileMap.get(student._id.toString());
        if (!profile || !profile.standard) continue;
        
        const struct = structureMap.get(`${profile.standard}-${profile.section}`);
        if (!struct) continue;

        for (const month of monthsToSeed) {
            // Determine if paid or pending using deterministic hash
            // Let's ensure ~75% PAID, 10% PARTIAL, 15% PENDING/OVERDUE
            const hash = hashInt(parseInt(student.uid?.split('-').pop() || "0") + month * 13);
            const prob = hash % 100;
            
            let status = "PENDING";
            let paidAmount = 0;
            
            if (prob < 75) {
                status = "PAID";
                paidAmount = struct.amount;
            } else if (prob < 85) {
                status = "PARTIAL";
                paidAmount = Math.floor(struct.amount / 2);
            } else if (month !== currentMonth && new Date().getDate() > struct.dueDay) {
                status = "OVERDUE";
            }

            const dueDate = new Date();
            dueDate.setMonth(month - 1);
            dueDate.setDate(struct.dueDay);

            assignments.push({
                schoolId: school._id,
                studentId: student._id,
                feeStructureId: struct._id,
                academicYear,
                month,
                amount: struct.amount,
                discount: 0,
                netAmount: struct.amount,
                paidAmount,
                status,
                dueDate,
                createdBy: admin._id
            });
        }
    }

    const insertedAssignments = await FeeAssignment.insertMany(assignments);

    // Generate payments for assignments that have paidAmount > 0
    for (const assignment of insertedAssignments) {
        if (assignment.paidAmount > 0) {
            // Make payment date a few days before due date
            const payDate = new Date(assignment.dueDate);
            payDate.setDate(payDate.getDate() - (hashInt(receiptCounter) % 5));

            payments.push({
                schoolId: school._id,
                feeAssignmentId: assignment._id,
                studentId: assignment.studentId,
                amount: assignment.paidAmount,
                paymentDate: payDate,
                paymentMode: ["CASH", "UPI", "ONLINE"][hashInt(receiptCounter) % 3],
                transactionRef: `TXN${receiptCounter}`,
                receiptNumber: generateReceiptString(receiptCounter++),
                recordedBy: admin._id
            });
        }
    }

    if (payments.length > 0) {
        await FeePayment.insertMany(payments);
        logger.info(`[${code}] Inserted ${payments.length} fee payments.`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Setup Salaries for Teachers
    // ─────────────────────────────────────────────────────────────────────────────
    logger.info(`[${code}] Generating Salary mock data...`);
    
    const teacherProfiles = await TeacherProfile.find({
        schoolId: school._id
    }).lean();

    const salaries = [];
    const currentYear = date.getFullYear();

    for (const profile of teacherProfiles) {
        if (!profile.expectedSalary) continue;

        for (const month of monthsToSeed) {
            // Adjust year if we crossed Jan 1
            let entryYear = currentYear;
            if (currentMonth < month) entryYear -= 1;

            const paidDate = new Date();
            paidDate.setFullYear(entryYear);
            paidDate.setMonth(month - 1);
            // Typically paid on 1st or 2nd
            paidDate.setDate(1 + (hashInt(entryYear + month) % 2));

            salaries.push({
                schoolId: school._id,
                teacherId: profile.userId,
                month,
                year: entryYear,
                amount: profile.expectedSalary,
                status: "PAID",
                paidDate,
                createdBy: admin._id,
                remarks: "Automated standard salary"
            });
        }
    }

    if (salaries.length > 0) {
        await Salary.insertMany(salaries);
        logger.info(`[${code}] Inserted ${salaries.length} salary records.`);
    }

    logger.info("=== Financial Seeding Complete ===");
};

export default seedFinancials;
