import { FeeStructure, FeeAssignment, FeePayment } from "./Fee.model.js";
import { FeeType } from "./FeeType.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// ADMIN — Fee Structure CRUD
// ═══════════════════════════════════════════════════════════════

export const createFeeStructure = async (schoolId, data, userId) => {
    const exists = await FeeStructure.exists({
        schoolId,
        academicYear: data.academicYear,
        standard: data.standard,
        section: data.section,
        feeType: data.feeType,
    });

    if (exists) {
        throw new ConflictError(
            `${data.feeType} fee already exists for ${data.standard} - ${data.section}(${data.academicYear})`
        );
    }

    const structure = await FeeStructure.create({
        schoolId,
        ...data,
        createdBy: userId,
    });

    logger.info(`FeeStructure created: ${structure._id} (${structure.feeType} for ${structure.standard} - ${structure.section})`);
    return structure;
};

export const getFeeStructures = async (schoolId, filters = {}, user = {}) => {
    const query = { schoolId };

    // Admin filters
    if (filters.standard) query.standard = filters.standard;
    if (filters.section) query.section = filters.section;

    if (filters.academicYear) query.academicYear = Number(filters.academicYear);
    if (filters.feeType) query.feeType = filters.feeType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive === "true";

    return await FeeStructure.find(query)
        .sort({ standard: 1, section: 1, feeType: 1 })
        .lean();
};

export const updateFeeStructure = async (schoolId, id, data, user) => {
    // Prevent updating key fields that define uniqueness
    const { schoolId: _, feeType: __, standard: ___, section: ____, academicYear: _____, ...safeUpdates } = data;

    const query = { _id: id, schoolId };

    const structure = await FeeStructure.findOneAndUpdate(
        query,
        safeUpdates,
        { new: true, runValidators: true }
    );

    if (!structure) throw new NotFoundError("Fee structure not found");
    logger.info(`FeeStructure updated: ${id} `);
    return structure;
};

export const deleteFeeStructure = async (schoolId, id, user) => {
    const query = { _id: id, schoolId };

    const structure = await FeeStructure.findOneAndDelete(query);
    if (!structure) throw new NotFoundError("Fee structure not found");

    // Cascade-delete associated assignments and their payments
    const assignments = await FeeAssignment.find({ feeStructureId: id }).select('_id').lean();
    if (assignments.length > 0) {
        const assignmentIds = assignments.map(a => a._id);
        await FeePayment.deleteMany({ feeAssignmentId: { $in: assignmentIds } });
        await FeeAssignment.deleteMany({ feeStructureId: id });
        logger.info(`Cascade-deleted ${assignments.length} assignments and related payments for FeeStructure ${id}`);
    }

    logger.info(`FeeStructure deleted: ${id}`);
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Assignment Generation
// ═══════════════════════════════════════════════════════════════

export const generateAssignments = async (schoolId, feeStructureId, month, year, userId, user) => {
    const query = { _id: feeStructureId, schoolId, isActive: true };

    const structure = await FeeStructure.findOne(query);
    if (!structure) throw new NotFoundError("Active fee structure not found");

    // Validate the month is applicable for this fee
    if (structure.applicableMonths.length > 0 && !structure.applicableMonths.includes(month)) {
        throw new BadRequestError(`Fee "${structure.name}" is not applicable for month ${month}`);
    }

    // Find all students in this class
    const students = await StudentProfile.find({
        schoolId,
        standard: structure.standard,
        section: structure.section,
    })
        .select("userId")
        .lean();

    if (students.length === 0) {
        return { total: 0, created: 0, skipped: 0, message: "No students found in this class" };
    }

    // Calculate due date
    const dueDate = new Date(year, month - 1, structure.dueDay || 10);

    let created = 0;
    let skipped = 0;

    for (const student of students) {
        try {
            await FeeAssignment.create({
                schoolId,
                studentId: student.userId,
                feeStructureId: structure._id,
                academicYear: year,
                month,
                amount: structure.amount,
                discount: 0,
                netAmount: structure.amount,
                paidAmount: 0,
                status: "PENDING",
                dueDate,
                createdBy: userId,
            });
            created++;
        } catch (error) {
            // Duplicate key means assignment already exists — skip
            if (error.code === 11000) {
                skipped++;
            } else {
                throw error;
            }
        }
    }

    logger.info(`Assignments generated for FeeStructure ${feeStructureId}: ${created} created, ${skipped} skipped`);
    return { created, skipped, total: students.length };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Assignment Management
// ═══════════════════════════════════════════════════════════════

export const updateAssignment = async (schoolId, assignmentId, data, user) => {
    const assignment = await FeeAssignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Fee assignment not found");

    // Allow updating discount, remarks, status (waived)
    if (data.discount !== undefined) {
        assignment.discount = data.discount;
        assignment.netAmount = assignment.amount - data.discount;

        // Recalculate status based on new netAmount
        if (assignment.paidAmount >= assignment.netAmount) {
            assignment.status = "PAID";
        } else if (assignment.paidAmount > 0) {
            assignment.status = "PARTIAL";
        }
    }

    if (data.remarks !== undefined) assignment.remarks = data.remarks;

    if (data.status === "WAIVED") {
        assignment.status = "WAIVED";
    }

    await assignment.save();
    logger.info(`FeeAssignment updated: ${assignmentId} `);
    return assignment;
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Payment Recording
// ═══════════════════════════════════════════════════════════════

// Generates a unique receipt number: RCP-SCHOOLID_SHORT-TIMESTAMP
const generateReceiptNumber = (schoolId) => {
    const shortId = String(schoolId).slice(-4).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `RCP - ${shortId} -${timestamp} `;
};

export const recordPayment = async (schoolId, assignmentId, paymentData, recordedBy, user) => {
    const assignment = await FeeAssignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Fee assignment not found");

    if (assignment.status === "PAID") {
        throw new ConflictError("This fee is already fully paid");
    }
    if (assignment.status === "WAIVED") {
        throw new ConflictError("This fee has been waived");
    }

    const remaining = assignment.netAmount - assignment.paidAmount;
    if (paymentData.amount > remaining) {
        throw new BadRequestError(`Payment amount(${paymentData.amount}) exceeds remaining balance(${remaining})`);
    }

    // Create payment record
    const payment = await FeePayment.create({
        schoolId,
        feeAssignmentId: assignmentId,
        studentId: assignment.studentId,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate || new Date(),
        paymentMode: paymentData.paymentMode,
        transactionRef: paymentData.transactionRef,
        receiptNumber: generateReceiptNumber(schoolId),
        remarks: paymentData.remarks,
        recordedBy,
    });

    // Update assignment
    assignment.paidAmount += paymentData.amount;
    assignment.status = assignment.paidAmount >= assignment.netAmount ? "PAID" : "PARTIAL";
    await assignment.save();

    logger.info(`Payment recorded: ${payment.receiptNumber} — ₹${payment.amount} for assignment ${assignmentId}`);
    return { payment, updatedAssignment: assignment };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Dashboard & Reports  
// ═══════════════════════════════════════════════════════════════

// Class-level fee overview for a specific month (Admin & Teacher view)
export const getClassFeeOverview = async (schoolId, academicYear, month, standard, section) => {
    // Get all assignments for this class/month
    const assignments = await FeeAssignment.find({
        schoolId,
        academicYear: Number(academicYear),
        month: Number(month),
    })
        .populate("studentId", "name email")
        .populate("feeStructureId", "feeType name")
        .lean();

    // Filter by class — join through feeStructure
    const filtered = assignments.filter((a) => {
        const fs = a.feeStructureId;
        return fs && fs.feeType; // only valid structures
    });

    // We need to also check that students belong to this class
    const studentProfiles = await StudentProfile.find({
        schoolId,
        standard,
        section,
    })
        .select("userId")
        .lean();

    const studentIdSet = new Set(studentProfiles.map((sp) => String(sp.userId)));
    const classAssignments = filtered.filter((a) => studentIdSet.has(String(a.studentId?._id)));

    // Group by student
    const studentMap = {};
    for (const a of classAssignments) {
        const sid = String(a.studentId._id);
        if (!studentMap[sid]) {
            studentMap[sid] = {
                studentId: a.studentId._id,
                name: a.studentId.name,
                email: a.studentId.email,
                fees: [],
            };
        }
        studentMap[sid].fees.push({
            assignmentId: a._id,
            feeType: a.feeStructureId?.feeType,
            name: a.feeStructureId?.name,
            amount: a.netAmount,
            paid: a.paidAmount,
            status: a.status,
            dueDate: a.dueDate,
        });
    }

    const students = Object.values(studentMap);

    // Summary
    const summary = {
        totalStudents: students.length,
        totalCollected: classAssignments.reduce((sum, a) => sum + a.paidAmount, 0),
        totalPending: classAssignments.filter((a) => a.status === "PENDING" || a.status === "PARTIAL")
            .reduce((sum, a) => sum + (a.netAmount - a.paidAmount), 0),
        totalOverdue: classAssignments.filter((a) => a.status === "OVERDUE")
            .reduce((sum, a) => sum + (a.netAmount - a.paidAmount), 0),
    };

    return { summary, students };
};

// All-classes summary for a specific month (Admin only)
export const getAllClassesFeeOverview = async (schoolId, academicYear, month) => {
    const assignments = await FeeAssignment.find({
        schoolId,
        academicYear: Number(academicYear),
        month: Number(month),
    })
        .populate("feeStructureId", "standard section feeType name")
        .lean();

    // Group by class (standard-section)
    const classMap = {};
    for (const a of assignments) {
        const fs = a.feeStructureId;
        if (!fs) continue;
        const key = `${fs.standard}-${fs.section}`;
        if (!classMap[key]) {
            classMap[key] = {
                standard: fs.standard,
                section: fs.section,
                totalDue: 0,
                totalCollected: 0,
                totalPending: 0,
                totalWaived: 0,
                studentCount: new Set(),
            };
        }

        const status = (a.status || "PENDING").toUpperCase();
        const netAmt = a.netAmount || 0;
        const paidAmt = a.paidAmount || 0;
        const remaining = Math.max(0, netAmt - paidAmt);

        const waivedAmt = (status === "WAIVED" || status === "PAID") ? remaining : 0;
        const pendingAmt = (status !== "PAID" && status !== "WAIVED") ? remaining : 0;

        classMap[key].totalDue += netAmt;
        classMap[key].totalCollected += paidAmt;
        classMap[key].totalPending += pendingAmt;
        classMap[key].totalWaived += waivedAmt;
        classMap[key].studentCount.add(String(a.studentId));
    }

    // Convert Sets to counts
    const classes = Object.values(classMap).map((c) => ({
        ...c,
        studentCount: c.studentCount.size,
    }));

    classes.sort((a, b) => a.standard.localeCompare(b.standard) || a.section.localeCompare(b.section));

    return { classes };
};

// Yearly fee summary across all months (Admin only)
export const getYearlyFeeSummary = async (schoolId, academicYear) => {
    const MONTH_LABELS = ["", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const assignments = await FeeAssignment.find({
        schoolId,
        academicYear: Number(academicYear),
    })
        .populate("feeStructureId", "feeType name")
        .lean();

    logger.info(`[DEBUG] getYearlyFeeSummary found ${assignments.length} assignments for year ${academicYear}`);

    // Group by month and type
    const monthMap = {};
    const typeMap = {};

    for (const a of assignments) {
        const status = (a.status || "PENDING").toUpperCase();
        const netAmt = Number(a.netAmount) || 0;
        const paidAmt = Number(a.paidAmount) || 0;
        const remaining = Math.max(0, netAmt - paidAmt);

        // Define status categories
        const isSettled = ["PAID", "WAIVED"].includes(status);
        
        const waivedAmt = isSettled ? remaining : 0;
        const pendingAmt = !isSettled ? remaining : 0;

        // Monthly aggregation
        const mKey = String(a.month);
        if (!monthMap[mKey]) {
            monthMap[mKey] = { totalDue: 0, totalCollected: 0, totalPending: 0, totalWaived: 0 };
        }
        monthMap[mKey].totalDue += netAmt;
        monthMap[mKey].totalCollected += paidAmt;
        monthMap[mKey].totalPending += pendingAmt;
        monthMap[mKey].totalWaived += waivedAmt;

        // Type aggregation
        const fs = a.feeStructureId;
        if (fs) {
            const type = fs.feeType || "OTHER";
            if (!typeMap[type]) {
                typeMap[type] = { totalDue: 0, totalCollected: 0, totalPending: 0, totalWaived: 0 };
            }
            typeMap[type].totalDue += netAmt;
            typeMap[type].totalCollected += paidAmt;
            typeMap[type].totalPending += pendingAmt;
            typeMap[type].totalWaived += waivedAmt;
        }
    }

    const monthlyBreakdown = Object.entries(monthMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([month, data]) => ({
            month: Number(month),
            label: MONTH_LABELS[Number(month)],
            totalDue: data.totalDue,
            totalCollected: data.totalCollected,
            totalPending: data.totalPending,
            totalWaived: data.totalWaived,
            collectionRate: data.totalDue > 0
                ? Number(((data.totalCollected / data.totalDue) * 100).toFixed(2))
                : 0,
        }));

    const typeBreakdown = Object.entries(typeMap)
        .map(([type, data]) => ({
            type,
            totalDue: data.totalDue,
            totalCollected: data.totalCollected,
            totalPending: data.totalPending,
            totalWaived: data.totalWaived,
            collectionRate: data.totalDue > 0
                ? Number(((data.totalCollected / data.totalDue) * 100).toFixed(2))
                : 0,
        }))
        .sort((a, b) => b.totalDue - a.totalDue);

    const yearTotal = {
        totalDue: monthlyBreakdown.reduce((s, m) => s + (m.totalDue || 0), 0),
        totalCollected: monthlyBreakdown.reduce((s, m) => s + (m.totalCollected || 0), 0),
        totalPending: monthlyBreakdown.reduce((s, m) => s + (m.totalPending || 0), 0),
        totalWaived: monthlyBreakdown.reduce((s, m) => s + (m.totalWaived || 0), 0),
    };

    yearTotal.collectionRate = yearTotal.totalDue > 0
        ? Number(((yearTotal.totalCollected / yearTotal.totalDue) * 100).toFixed(2))
        : 0;

    logger.info(`[DEBUG] getYearlyFeeSummary result breakdown count: ${monthlyBreakdown.length}, type count: ${typeBreakdown.length}`);
    return { academicYear: Number(academicYear), monthlyBreakdown, typeBreakdown, yearTotal };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN + TEACHER — Student Fee History
// ═══════════════════════════════════════════════════════════════

export const getStudentFeeHistory = async (schoolId, studentId, academicYear) => {
    const query = { schoolId, studentId };
    if (academicYear) query.academicYear = Number(academicYear);

    const assignments = await FeeAssignment.find(query)
        .populate("feeStructureId", "feeType name frequency")
        .sort({ academicYear: -1, month: 1 })
        .lean();

    // Fetch related payments
    const assignmentIds = assignments.map((a) => a._id);
    const payments = await FeePayment.find({
        feeAssignmentId: { $in: assignmentIds },
    })
        .sort({ paymentDate: -1 })
        .lean();

    // Map payments to assignments
    const paymentMap = {};
    for (const p of payments) {
        const aid = String(p.feeAssignmentId);
        if (!paymentMap[aid]) paymentMap[aid] = [];
        paymentMap[aid].push({
            amount: p.amount,
            date: p.paymentDate,
            mode: p.paymentMode,
            receiptNumber: p.receiptNumber,
            transactionRef: p.transactionRef,
        });
    }

    const fees = assignments.map((a) => ({
        assignmentId: a._id,
        month: a.month,
        academicYear: a.academicYear,
        feeType: a.feeStructureId?.feeType,
        name: a.feeStructureId?.name,
        amount: a.netAmount,
        paid: a.paidAmount,
        status: a.status,
        dueDate: a.dueDate,
        payments: paymentMap[String(a._id)] || [],
    }));

    // Summary
    const summary = {
        totalDue: fees.reduce((s, f) => s + f.amount, 0),
        totalPaid: fees.reduce((s, f) => s + f.paid, 0),
        totalPending: fees.filter(f => !["PAID", "WAIVED"].includes((f.status || "").toUpperCase()))
            .reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0),
        totalWaived: fees.filter(f => ["PAID", "WAIVED"].includes((f.status || "").toUpperCase()))
            .reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0),
    };

    return { summary, fees };
};

// ═══════════════════════════════════════════════════════════════
// STUDENT — My Fees (mobile + web)
// ═══════════════════════════════════════════════════════════════

export const getMyFees = async (schoolId, studentId, filters = {}, platform) => {
    const query = { schoolId, studentId };
    if (filters.academicYear) query.academicYear = Number(filters.academicYear);
    if (filters.month) query.month = Number(filters.month);

    const assignments = await FeeAssignment.find(query)
        .populate("feeStructureId", "feeType name frequency")
        .sort({ academicYear: -1, month: 1 })
        .lean();

    const fees = assignments.map((a) => ({
        assignmentId: a._id,
        month: a.month,
        academicYear: a.academicYear,
        feeType: a.feeStructureId?.feeType,
        name: a.feeStructureId?.name,
        amount: a.netAmount,
        paid: a.paidAmount,
        status: a.status,
        dueDate: a.dueDate,
    }));

    // Summary
    const summary = {
        totalDue: fees.reduce((s, f) => s + f.amount, 0),
        totalPaid: fees.reduce((s, f) => s + f.paid, 0),
        totalPending: fees.reduce((s, f) => s + (f.amount - f.paid), 0),
    };

    // On web or if detailed=true, include payment history
    if (platform !== "mobile" || filters.detailed === "true") {
        const assignmentIds = assignments.map((a) => a._id);
        const payments = await FeePayment.find({
            feeAssignmentId: { $in: assignmentIds },
        })
            .sort({ paymentDate: -1 })
            .lean();

        const paymentMap = {};
        for (const p of payments) {
            const aid = String(p.feeAssignmentId);
            if (!paymentMap[aid]) paymentMap[aid] = [];
            paymentMap[aid].push({
                amount: p.amount,
                date: p.paymentDate,
                mode: p.paymentMode,
                receiptNumber: p.receiptNumber,
            });
        }

        fees.forEach((f) => {
            f.payments = paymentMap[String(f.assignmentId)] || [];
        });
    }

    return { summary, fees };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Fee Type Management
// ═══════════════════════════════════════════════════════════════

const DEFAULT_FEE_TYPES = [
    { name: "TUITION", label: "Tuition", isDefault: true },
    { name: "EXAM", label: "Exam", isDefault: true },
    { name: "LAB", label: "Lab", isDefault: true },
    { name: "LIBRARY", label: "Library", isDefault: true },
    { name: "TRANSPORT", label: "Transport", isDefault: true },
    { name: "SPORTS", label: "Sports", isDefault: true },
];

export const getFeeTypes = async (schoolId) => {
    const customTypes = await FeeType.find({ schoolId, isActive: true }).lean();
    return [...DEFAULT_FEE_TYPES, ...customTypes];
};

export const createFeeType = async (schoolId, data, userId) => {
    // Check if it's in default list
    if (DEFAULT_FEE_TYPES.some(t => t.name === data.name)) {
        throw new ConflictError(`Fee type ${data.name} is a system default`);
    }

    const exists = await FeeType.exists({ schoolId, name: data.name });
    if (exists) {
        throw new ConflictError(`Fee type ${data.name} already exists`);
    }

    const feeType = await FeeType.create({
        schoolId,
        ...data,
        createdBy: userId,
    });

    logger.info(`FeeType created: ${feeType._id} (${feeType.name}) for school ${schoolId}`);
    return feeType;
};
