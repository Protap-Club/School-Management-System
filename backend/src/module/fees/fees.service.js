import mongoose from "mongoose";
import { FeeStructure, FeeAssignment, FeePayment, StudentPenalty } from "./Fee.model.js";
import { FeeType } from "./FeeType.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import {
    assertClassSectionExists,
    buildClassSectionKey,
    getConfiguredClassSections,
    sortClassSections,
} from "../../utils/classSection.util.js";

const TYPE_CATEGORIES = {
    FEE: "FEE",
    PENALTY: "PENALTY",
};

const DEFAULT_FEE_TYPES = [
    { name: "TUITION", label: "Tuition", isDefault: true },
    { name: "EXAM", label: "Exam", isDefault: true },
    { name: "LAB", label: "Lab", isDefault: true },
    { name: "LIBRARY", label: "Library", isDefault: true },
    { name: "TRANSPORT", label: "Transport", isDefault: true },
    { name: "SPORTS", label: "Sports", isDefault: true },
];

const DEFAULT_PENALTY_TYPES = [
    { name: "DAMAGE", label: "Damage", isDefault: true },
    { name: "LATE_FEE", label: "Late Fee", isDefault: true },
    { name: "MISCONDUCT", label: "Misconduct", isDefault: true },
    { name: "LIBRARY_FINE", label: "Library Fine", isDefault: true },
    { name: "UNIFORM_VIOLATION", label: "Uniform Violation", isDefault: true },
];

const getDefaultTypesByCategory = (category) =>
    category === TYPE_CATEGORIES.PENALTY ? DEFAULT_PENALTY_TYPES : DEFAULT_FEE_TYPES;

const getTypeQueryByCategory = (schoolId, category) => (
    category === TYPE_CATEGORIES.FEE
        ? {
            schoolId,
            isActive: true,
            $or: [
                { category: TYPE_CATEGORIES.FEE },
                { category: { $exists: false } },
            ],
        }
        : {
            schoolId,
            isActive: true,
            category,
        }
);

const getTypesByCategory = async (schoolId, category) => {
    const customTypes = await FeeType.find(getTypeQueryByCategory(schoolId, category)).lean();
    return [...getDefaultTypesByCategory(category), ...customTypes];
};

const createTypeByCategory = async (schoolId, data, userId, category) => {
    const normalizedName = String(data.name || "").trim().toUpperCase();
    const normalizedLabel = String(data.label || "").trim();

    if (!normalizedName || !normalizedLabel) {
        throw new BadRequestError("Type name and label are required");
    }

    if (getDefaultTypesByCategory(category).some((type) => type.name === normalizedName)) {
        throw new ConflictError(`${category === TYPE_CATEGORIES.PENALTY ? "Penalty" : "Fee"} type ${normalizedName} is a system default`);
    }

    const exists = await FeeType.exists({ schoolId, name: normalizedName });
    if (exists) {
        throw new ConflictError(`${category === TYPE_CATEGORIES.PENALTY ? "Penalty" : "Fee"} type ${normalizedName} already exists`);
    }

    const feeType = await FeeType.create({
        schoolId,
        name: normalizedName,
        label: normalizedLabel,
        category,
        createdBy: userId,
    });

    logger.info(`${category} type created: ${feeType._id} (${feeType.name}) for school ${schoolId}`);
    return feeType;
};

const assertTypeExists = async (schoolId, typeName, category) => {
    const normalizedName = String(typeName || "").trim().toUpperCase();
    if (!normalizedName) {
        throw new BadRequestError(`${category === TYPE_CATEGORIES.PENALTY ? "Penalty" : "Fee"} type is required`);
    }

    const allowedTypes = await getTypesByCategory(schoolId, category);
    const isAllowed = allowedTypes.some((type) => String(type.name).trim().toUpperCase() === normalizedName);

    if (!isAllowed) {
        throw new BadRequestError(`Invalid ${category === TYPE_CATEGORIES.PENALTY ? "penalty" : "fee"} type: ${normalizedName}`);
    }

    return normalizedName;
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Fee Structure CRUD
// ═══════════════════════════════════════════════════════════════

export const createFeeStructure = async (schoolId, data, userId) => {
    const standards = Array.isArray(data.standard) ? data.standard : [data.standard];
    const sections = Array.isArray(data.section) ? data.section : [data.section];

    const results = [];
    const summary = { total: standards.length * sections.length, created: 0, skipped: 0, errors: [] };

    for (const std of standards) {
        for (const sect of sections) {
            try {
                const normalizedClass = await assertClassSectionExists(
                    schoolId,
                    std,
                    sect,
                    { message: `Class ${std}-${sect} is not configured in School Settings` }
                );

                const payload = {
                    ...data,
                    standard: normalizedClass.standard,
                    section: normalizedClass.section,
                };

                // Check for duplicate months across all structures of the same type/std/sect
                const existingStructures = await FeeStructure.find({
                    schoolId,
                    academicYear: payload.academicYear,
                    standard: payload.standard,
                    section: payload.section,
                    feeType: payload.feeType,
                });

                if (existingStructures.length > 0) {
                    const occupied = new Set();
                    existingStructures.forEach(st => (st.applicableMonths || []).forEach(m => occupied.add(m)));
                    
                    const duplicateMonths = (payload.applicableMonths || []).filter(m => occupied.has(m));
                    
                    if (duplicateMonths.length > 0) {
                        const monthNames = duplicateMonths.map(m => new Date(2000, m-1).toLocaleString('default', { month: 'long' }));
                        throw new ConflictError(
                            `${payload.feeType} fee already created for ${monthNames.join(', ')} in ${payload.standard}-${payload.section}`
                        );
                    }
                    
                    // If no month overlap, we can't create a secondary structure because of the unique index constraint
                    // Unless we were to merge them, which is out of scope for 'minimal changes'.
                    // For now, if no overlap, we still check the primary index.
                }

                const exists = await FeeStructure.exists({
                    schoolId,
                    academicYear: payload.academicYear,
                    standard: payload.standard,
                    section: payload.section,
                    feeType: payload.feeType,
                });

                if (exists) {
                    summary.skipped++;
                    continue;
                }

                const structure = await FeeStructure.create({
                    schoolId,
                    ...payload,
                    createdBy: userId,
                });

                logger.info(`FeeStructure created: ${structure._id} (${structure.feeType} for ${structure.standard} - ${structure.section})`);
                results.push(structure);
                summary.created++;
            } catch (error) {
                summary.errors.push({ standard: std, section: sect, error: error.message });
                logger.error(`Error creating fee structure for ${std}-${sect}: ${error.message}`);
            }
        }
    }

    const isMultiMode = Array.isArray(data.standard) || Array.isArray(data.section);

    if (isMultiMode) {
        return { summary, structures: results };
    }

    // Existing behavior for single class/section: throw if skipped or error
    if (summary.skipped > 0) {
        throw new ConflictError(
            `${data.feeType} fee already exists for ${data.standard} - ${data.section}(${data.academicYear})`
        );
    }
    if (summary.errors.length > 0) {
        throw new BadRequestError(summary.errors[0].error);
    }

    return results[0];
};

export const getFeeStructures = async (schoolId, filters = {}) => {
    const query = { schoolId };

    // Admin filters
    if (filters.standard) query.standard = String(filters.standard).trim();
    if (filters.section) query.section = String(filters.section).trim().toUpperCase();

    if (filters.academicYear) query.academicYear = Number(filters.academicYear);
    if (filters.feeType) query.feeType = filters.feeType;
    if (filters.isActive !== undefined) query.isActive = filters.isActive === "true";

    const page = Math.max(0, Number(filters.page) || 0);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
    const totalCount = await FeeStructure.countDocuments(query);

    const structures = await FeeStructure.find(query)
        .sort({ standard: 1, section: 1, feeType: 1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .lean();

    return {
        structures,
        pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
    };
};

export const updateFeeStructure = async (schoolId, id, data) => {
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

export const deleteFeeStructure = async (schoolId, id) => {
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const query = { _id: feeStructureId, schoolId, isActive: true };

        // Teacher check
        if (user && user.role === USER_ROLES.TEACHER) {
            const profile = await TeacherProfile.findOne({ userId: user._id, schoolId }).lean().session(session);
            if (!profile) throw new ForbiddenError("Teacher profile not found");
            const classFilters = profile.assignedClasses.map(c => ({ standard: c.standard, section: c.section }));
            if (classFilters.length === 0) throw new ForbiddenError("No classes assigned to you");
            query.$or = classFilters;
        }

    const structure = await FeeStructure.findOne(query);
    if (!structure) throw new NotFoundError("Active fee structure not found");

        // Find all students in this class
        const students = await StudentProfile.find({
            schoolId,
            standard: structure.standard,
            section: structure.section,
        })
            .select("userId")
            .lean()
            .session(session);

        if (students.length === 0) {
            await session.commitTransaction();
            return { total: 0, created: 0, skipped: 0, message: "No students found in this class" };
        }

        // Calculate actual calendar year for the due date
        // If month is Jan-May (1-5), it belongs to the second half of the academic session (Year + 1)
        const ACADEMIC_YEAR_START_MONTH = 6;
        const targetYear = month < ACADEMIC_YEAR_START_MONTH ? year + 1 : year;
        const dueDate = new Date(targetYear, month - 1, structure.dueDay || 10);

        // Step 1: Find existing assignments in one query
        const existingAssignments = await FeeAssignment.find({
            schoolId,
            feeStructureId: structure._id,
            academicYear: year,
            month,
            studentId: { $in: students.map(s => s.userId) },
        }).select("studentId").lean().session(session);

        const existingStudentIds = new Set(
            existingAssignments.map(a => String(a.studentId))
        );

        // Step 2: Build new assignment documents
        const newAssignments = students
            .filter(s => !existingStudentIds.has(String(s.userId)))
            .map(student => ({
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
            }));

        // Step 3: Bulk insert
        if (newAssignments.length > 0) {
            await FeeAssignment.insertMany(newAssignments, { session, ordered: false });
        }

        const created = newAssignments.length;
        const skipped = existingStudentIds.size;

        await session.commitTransaction();
        logger.info(`Assignments generated for FeeStructure ${feeStructureId}: ${created} created, ${skipped} skipped`);
        return { created, skipped, total: students.length };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Assignment Management
// ═══════════════════════════════════════════════════════════════

export const updateAssignment = async (schoolId, assignmentId, data) => {
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

export const recordPayment = async (schoolId, assignmentId, paymentData, recordedBy) => {
    const assignment = await FeeAssignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Fee assignment not found");

    if (assignment.status === "PAID") {
        throw new ConflictError("This fee is already fully paid");
    }
    if (assignment.status === "WAIVED") {
        throw new ConflictError("This fee has been waived");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create payment record
        const [payment] = await FeePayment.create([{
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
        }], { session });

        // Update assignment
        assignment.paidAmount += paymentData.amount;
        assignment.status = assignment.paidAmount >= assignment.netAmount ? "PAID" : "PARTIAL";
        await assignment.save({ session });

        await session.commitTransaction();
        logger.info(`Payment recorded: ${payment.receiptNumber} — ₹${payment.amount} for assignment ${assignmentId}`);
        return { payment, updatedAssignment: assignment };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Dashboard & Reports  
// ═══════════════════════════════════════════════════════════════

// Class-level fee overview for a specific month (Admin & Teacher view)
export const getClassFeeOverview = async (schoolId, academicYear, month, standard, section) => {
    const pipeline = [
        // Start with assignments for this month/year
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
                month: Number(month),
            },
        },
        // Look up fee structure info to filter by class
        {
            $lookup: {
                from: "feestructures",
                localField: "feeStructureId",
                foreignField: "_id",
                as: "structure",
                pipeline: [{ $project: { standard: 1, section: 1, feeType: 1, name: 1 } }],
            },
        },
        { $unwind: "$structure" },
        // Filter by the requested class
        {
            $match: {
                "structure.standard": standard,
                "structure.section": section,
            },
        },
        // Look up student/user identity
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { name: 1, email: 1 } }],
            },
        },
        { $unwind: "$user" },
        // Look up all payments for this assignment
        {
            $lookup: {
                from: "feepayments",
                localField: "_id",
                foreignField: "feeAssignmentId",
                as: "payments",
                pipeline: [{ $project: { receiptNumber: 1, paymentDate: 1, paymentMode: 1 } }, { $sort: { paymentDate: -1 } }],
            },
        },
        // Project final shape per student
        {
            $project: {
                _id: 0,
                studentId: 1,
                name: "$user.name",
                email: "$user.email",
                fee: {
                    assignmentId: "$_id",
                    feeType: "$structure.feeType",
                    name: "$structure.name",
                    amount: "$netAmount",
                    paid: "$paidAmount",
                    status: "$status",
                    dueDate: "$dueDate",
                    remarks: "$remarks",
                    payments: "$payments",
                },
            },
        },
        // Group by student to aggregate multiple fees (if any)
        {
            $group: {
                _id: "$studentId",
                name: { $first: "$name" },
                email: { $first: "$email" },
                fees: { $push: "$fee" },
            },
        },
        {
            $project: {
                _id: 0,
                studentId: "$_id",
                name: 1,
                email: 1,
                fees: 1,
            },
        },
        // Final stage: Facet to get both student list and summary
        {
            $facet: {
                students: [{ $match: {} }],
                summary: [
                    { $unwind: "$fees" },
                    {
                        $group: {
                            _id: null,
                            totalCollected: { $sum: "$fees.paid" },
                            totalPending: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$fees.status", ["PENDING", "PARTIAL", "OVERDUE"]] },
                                        { $subtract: ["$fees.amount", "$fees.paid"] },
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    ];

    const [result] = await FeeAssignment.aggregate(pipeline);

    // Default values if no records found
    const summary = result?.summary?.[0] || {
        totalCollected: 0,
        totalPending: 0,
    };
    
    // Set student count from facets
    summary.totalStudents = result?.students?.length || 0;

    return { summary, students: result?.students || [] };
};

// All-classes summary for a specific month (Admin only)
export const getAllClassesFeeOverview = async (schoolId, academicYear, month) => {
    // Get unique standard+section pairs from fee structures for this year/month
    const structurePairs = await FeeStructure.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
                applicableMonths: Number(month),
                isActive: true,
            },
        },
        {
            $group: {
                _id: { standard: "$standard", section: "$section" },
            },
        },
        {
            $project: {
                _id: 0,
                standard: "$_id.standard",
                section: "$_id.section",
            },
        },
    ]);

    const sortedPairs = sortClassSections(structurePairs);

    const pipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
                month: Number(month),
            },
        },
        {
            $lookup: {
                from: "feestructures",
                localField: "feeStructureId",
                foreignField: "_id",
                as: "structure",
            },
        },
        { $unwind: "$structure" },
        // Stage 1: Group by Class + Student to get unique students and their totals
        {
            $group: {
                _id: { 
                    standard: "$structure.standard", 
                    section: "$structure.section",
                    studentId: "$studentId"
                },
                studentDue: { $sum: "$netAmount" },
                studentCollected: { $sum: "$paidAmount" },
                studentPending: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["PENDING", "PARTIAL", "OVERDUE"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
                studentWaived: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["WAIVED", "PAID"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
            },
        },
        // Stage 2: Group by Class to get the final overview
        {
            $group: {
                _id: { standard: "$_id.standard", section: "$_id.section" },
                studentCount: { $sum: 1 },
                totalDue: { $sum: "$studentDue" },
                totalCollected: { $sum: "$studentCollected" },
                totalPending: { $sum: "$studentPending" },
                totalWaived: { $sum: "$studentWaived" },
            },
        },
        {
            $project: {
                _id: 0,
                standard: "$_id.standard",
                section: "$_id.section",
                studentCount: 1,
                totalDue: 1,
                totalCollected: 1,
                totalPending: 1,
                totalWaived: 1,
            },
        },
    ];

    const rawClasses = await FeeAssignment.aggregate(pipeline);

    // Build a lookup map from aggregation results
    const classMap = new Map();
    for (const c of rawClasses) {
        classMap.set(buildClassSectionKey(c.standard, c.section), c);
    }

    // Merge with structurePairs (shows classes even if no assignments yet)
    const classes = sortedPairs.map((cs) => {
        const key = buildClassSectionKey(cs.standard, cs.section);
        const data = classMap.get(key);

        return {
            standard: cs.standard,
            section: cs.section,
            studentCount: data?.studentCount || 0,
            totalDue: data?.totalDue || 0,
            totalCollected: data?.totalCollected || 0,
            totalPending: data?.totalPending || 0,
            totalWaived: data?.totalWaived || 0,
        };
    });

    return { classes };
};

// Yearly fee summary across all months (Admin only)
export const getYearlyFeeSummary = async (schoolId, academicYear) => {
    const MONTH_LABELS = ["", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    // Monthly breakdown — single aggregation
    const monthlyPipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
            },
        },
        {
            $group: {
                _id: "$month",
                totalDue: { $sum: "$netAmount" },
                totalCollected: { $sum: "$paidAmount" },
                totalPending: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["PENDING", "PARTIAL", "OVERDUE"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
                totalWaived: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["WAIVED", "PAID"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ];

    // Type breakdown — single aggregation
    const typePipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
            },
        },
        {
            $lookup: {
                from: "feestructures",
                localField: "feeStructureId",
                foreignField: "_id",
                as: "structure",
                pipeline: [{ $project: { feeType: 1 } }],
            },
        },
        { $unwind: { path: "$structure", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { $ifNull: ["$structure.feeType", "OTHER"] },
                totalDue: { $sum: "$netAmount" },
                totalCollected: { $sum: "$paidAmount" },
                totalPending: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["PENDING", "PARTIAL", "OVERDUE"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
                totalWaived: {
                    $sum: {
                        $cond: [
                            { $in: ["$status", ["WAIVED", "PAID"]] },
                            { $max: [{ $subtract: ["$netAmount", "$paidAmount"] }, 0] },
                            0,
                        ],
                    },
                },
            },
        },
        { $sort: { totalDue: -1 } },
    ];

    const [monthlyRows, typeRows] = await Promise.all([
        FeeAssignment.aggregate(monthlyPipeline),
        FeeAssignment.aggregate(typePipeline),
    ]);

    const monthlyBreakdown = monthlyRows.map((row) => {
        const collectionRate = row.totalDue > 0
            ? Number(((row.totalCollected / row.totalDue) * 100).toFixed(2)) : 0;
        return {
            month: row._id,
            label: MONTH_LABELS[row._id],
            totalDue: row.totalDue,
            totalCollected: row.totalCollected,
            totalPending: row.totalPending,
            totalWaived: row.totalWaived,
            collectionRate,
        };
    });

    const typeBreakdown = typeRows.map((row) => ({
        type: row._id,
        totalDue: row.totalDue,
        totalCollected: row.totalCollected,
        totalPending: row.totalPending,
        totalWaived: row.totalWaived,
        collectionRate: row.totalDue > 0
            ? Number(((row.totalCollected / row.totalDue) * 100).toFixed(2)) : 0,
    }));

    const yearTotal = {
        totalDue: monthlyBreakdown.reduce((s, m) => s + m.totalDue, 0),
        totalCollected: monthlyBreakdown.reduce((s, m) => s + m.totalCollected, 0),
        totalPending: monthlyBreakdown.reduce((s, m) => s + m.totalPending, 0),
        totalWaived: monthlyBreakdown.reduce((s, m) => s + m.totalWaived, 0),
    };
    yearTotal.collectionRate = yearTotal.totalDue > 0
        ? Number(((yearTotal.totalCollected / yearTotal.totalDue) * 100).toFixed(2)) : 0;

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

export const getFeeTypes = async (schoolId) => {
    return getTypesByCategory(schoolId, TYPE_CATEGORIES.FEE);
};

export const createFeeType = async (schoolId, data, userId) => {
    return createTypeByCategory(schoolId, data, userId, TYPE_CATEGORIES.FEE);
};

export const getPenaltyTypes = async (schoolId) => {
    return getTypesByCategory(schoolId, TYPE_CATEGORIES.PENALTY);
};

export const createPenaltyType = async (schoolId, data, userId) => {
    return createTypeByCategory(schoolId, data, userId, TYPE_CATEGORIES.PENALTY);
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Student Penalty
// ═══════════════════════════════════════════════════════════════

export const getStudentsByClass = async (schoolId, standard, section) => {
    const students = await StudentProfile.find({
        schoolId,
        standard: String(standard).trim(),
        section: String(section).trim().toUpperCase(),
    })
        .select("userId")
        .populate({ path: "userId", select: "name email", match: { isActive: true, isArchived: false } })
        .lean();

    return students
        .filter(s => s.userId)
        .map(s => ({ _id: s.userId._id, name: s.userId.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

export const getPenaltyStudentsByClass = async (schoolId, filters = {}) => {
    const query = {
        schoolId,
        standard: String(filters.standard || "").trim(),
        section: String(filters.section || "").trim().toUpperCase(),
    };

    if (filters.academicYear) {
        query.academicYear = Number(filters.academicYear);
    }

    const penalties = await StudentPenalty.find(query)
        .select("studentId")
        .populate({
            path: "studentId",
            select: "name email isActive isArchived",
            match: { isActive: true, isArchived: false },
        })
        .lean();

    const studentMap = new Map();

    penalties.forEach((item) => {
        const student = item.studentId;
        if (!student?._id) return;

        const key = String(student._id);
        if (!studentMap.has(key)) {
            studentMap.set(key, {
                _id: student._id,
                name: student.name,
                email: student.email,
            });
        }
    });

    return Array.from(studentMap.values()).sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
            sensitivity: "base",
        })
    );
};

export const getStudentPenalties = async (schoolId, filters = {}) => {
    const query = { schoolId };

    if (filters.academicYear) {
        query.academicYear = Number(filters.academicYear);
    }
    if (filters.standard) {
        query.standard = String(filters.standard).trim();
    }
    if (filters.section) {
        query.section = String(filters.section).trim().toUpperCase();
    }
    if (filters.studentId) {
        query.studentId = filters.studentId;
    }

    const penalties = await StudentPenalty.find(query)
        .populate({
            path: "studentId",
            select: "name email isActive isArchived",
            match: { isActive: true, isArchived: false },
        })
        .sort({ occurrenceDate: -1, createdAt: -1 })
        .lean();

    return penalties
        .filter((item) => item.studentId?._id)
        .map((item) => ({
            _id: item._id,
            studentId: item.studentId._id,
            studentName: item.studentId.name,
            studentEmail: item.studentId.email,
            academicYear: item.academicYear,
            standard: item.standard,
            section: item.section,
            penaltyType: item.penaltyType,
            reason: item.reason,
            amount: item.amount,
            paidAmount: item.paidAmount,
            status: item.status,
            occurrenceDate: item.occurrenceDate,
            createdAt: item.createdAt,
        }));
};

export const createStudentPenalty = async (schoolId, data, userId) => {
    const penaltyType = await assertTypeExists(schoolId, data.penaltyType, TYPE_CATEGORIES.PENALTY);

    const penalty = await StudentPenalty.create({
        schoolId,
        studentId: data.studentId,
        academicYear: Number(data.academicYear),
        standard: String(data.standard).trim(),
        section: String(data.section).trim().toUpperCase(),
        penaltyType,
        reason: data.reason,
        amount: Number(data.amount),
        occurrenceDate: new Date(data.occurrenceDate),
        createdBy: userId,
    });

    logger.info(`StudentPenalty created: ${penalty._id} (${penalty.penaltyType}) for student ${data.studentId}`);
    return penalty;
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Update Penalty Status (PENDING → PAID / WAIVED)
// ═══════════════════════════════════════════════════════════════

export const updatePenaltyStatus = async (schoolId, penaltyId, data) => {
    const penalty = await StudentPenalty.findOne({ _id: penaltyId, schoolId });
    if (!penalty) throw new NotFoundError("Penalty not found");

    if (penalty.status !== "PENDING") {
        throw new BadRequestError(`Cannot update penalty — current status is already ${penalty.status}`);
    }

    if (data.status === "PAID") {
        penalty.status = "PAID";
        penalty.paidAmount = penalty.amount;
    } else if (data.status === "WAIVED") {
        penalty.status = "WAIVED";
        penalty.paidAmount = 0;
    } else {
        throw new BadRequestError("Invalid status. Only PAID or WAIVED are allowed.");
    }

    await penalty.save();
    logger.info(`StudentPenalty ${penaltyId} status updated to ${data.status}`);
    return penalty;
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — All-Classes Penalty Overview
// ═══════════════════════════════════════════════════════════════

export const getAllClassesPenaltyOverview = async (schoolId, academicYear) => {
    const pipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
            },
        },
        // Group by class + student to get unique student count
        {
            $group: {
                _id: {
                    standard: "$standard",
                    section: "$section",
                    studentId: "$studentId",
                },
                studentTotalAssigned: { $sum: "$amount" },
                studentCollected: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "PAID"] }, "$paidAmount", 0],
                    },
                },
                studentPending: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
                    },
                },
                studentWaived: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "WAIVED"] }, "$amount", 0],
                    },
                },
            },
        },
        // Group by class
        {
            $group: {
                _id: { standard: "$_id.standard", section: "$_id.section" },
                studentCount: { $sum: 1 },
                totalAssigned: { $sum: "$studentTotalAssigned" },
                totalCollected: { $sum: "$studentCollected" },
                totalPending: { $sum: "$studentPending" },
                totalWaived: { $sum: "$studentWaived" },
            },
        },
        {
            $project: {
                _id: 0,
                standard: "$_id.standard",
                section: "$_id.section",
                studentCount: 1,
                totalAssigned: 1,
                totalCollected: 1,
                totalPending: 1,
                totalWaived: 1,
            },
        },
    ];

    const rawClasses = await StudentPenalty.aggregate(pipeline);
    const classes = sortClassSections(rawClasses);

    return { classes };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Class-Level Penalty Overview (student-by-student)
// ═══════════════════════════════════════════════════════════════

export const getClassPenaltyOverview = async (schoolId, academicYear, standard, section) => {
    const pipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
                standard: String(standard).trim(),
                section: String(section).trim().toUpperCase(),
            },
        },
        // Look up student user info
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { name: 1, email: 1 } }],
            },
        },
        { $unwind: "$user" },
        // Project penalty shape
        {
            $project: {
                _id: 0,
                studentId: 1,
                name: "$user.name",
                email: "$user.email",
                penalty: {
                    penaltyId: "$_id",
                    penaltyType: "$penaltyType",
                    reason: "$reason",
                    amount: "$amount",
                    paidAmount: "$paidAmount",
                    status: "$status",
                    occurrenceDate: "$occurrenceDate",
                },
            },
        },
        // Group by student
        {
            $group: {
                _id: "$studentId",
                name: { $first: "$name" },
                email: { $first: "$email" },
                penalties: { $push: "$penalty" },
            },
        },
        {
            $project: {
                _id: 0,
                studentId: "$_id",
                name: 1,
                email: 1,
                penalties: 1,
            },
        },
        // Facet for both list and summary
        {
            $facet: {
                students: [{ $match: {} }],
                summary: [
                    { $unwind: "$penalties" },
                    {
                        $group: {
                            _id: null,
                            totalAssigned: { $sum: "$penalties.amount" },
                            totalCollected: {
                                $sum: {
                                    $cond: [{ $eq: ["$penalties.status", "PAID"] }, "$penalties.paidAmount", 0],
                                },
                            },
                            totalPending: {
                                $sum: {
                                    $cond: [{ $eq: ["$penalties.status", "PENDING"] }, "$penalties.amount", 0],
                                },
                            },
                            totalWaived: {
                                $sum: {
                                    $cond: [{ $eq: ["$penalties.status", "WAIVED"] }, "$penalties.amount", 0],
                                },
                            },
                        },
                    },
                ],
            },
        },
    ];

    const [result] = await StudentPenalty.aggregate(pipeline);

    const summary = result?.summary?.[0] || {
        totalAssigned: 0,
        totalCollected: 0,
        totalPending: 0,
        totalWaived: 0,
    };
    summary.totalStudents = result?.students?.length || 0;

    return { summary, students: result?.students || [] };
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — Yearly Penalty Summary
// ═══════════════════════════════════════════════════════════════

export const getYearlyPenaltySummary = async (schoolId, academicYear) => {
    const MONTH_LABELS_ARR = ["", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const pipeline = [
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                academicYear: Number(academicYear),
            },
        },
        {
            $addFields: {
                penaltyMonth: { $month: "$occurrenceDate" },
            },
        },
        {
            $group: {
                _id: "$penaltyMonth",
                totalAssigned: { $sum: "$amount" },
                totalCollected: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "PAID"] }, "$paidAmount", 0],
                    },
                },
                totalPending: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
                    },
                },
                totalWaived: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "WAIVED"] }, "$amount", 0],
                    },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ];

    const monthlyRows = await StudentPenalty.aggregate(pipeline);

    const monthlyBreakdown = monthlyRows.map((row) => ({
        month: row._id,
        label: MONTH_LABELS_ARR[row._id] || `Month ${row._id}`,
        totalAssigned: row.totalAssigned,
        totalCollected: row.totalCollected,
        totalPending: row.totalPending,
        totalWaived: row.totalWaived,
        count: row.count,
        collectionRate: row.totalAssigned > 0
            ? Number(((row.totalCollected / row.totalAssigned) * 100).toFixed(2)) : 0,
    }));

    const yearTotal = {
        totalAssigned: monthlyBreakdown.reduce((s, m) => s + m.totalAssigned, 0),
        totalCollected: monthlyBreakdown.reduce((s, m) => s + m.totalCollected, 0),
        totalPending: monthlyBreakdown.reduce((s, m) => s + m.totalPending, 0),
        totalWaived: monthlyBreakdown.reduce((s, m) => s + m.totalWaived, 0),
        count: monthlyBreakdown.reduce((s, m) => s + m.count, 0),
    };
    yearTotal.collectionRate = yearTotal.totalAssigned > 0
        ? Number(((yearTotal.totalCollected / yearTotal.totalAssigned) * 100).toFixed(2)) : 0;

    return { academicYear: Number(academicYear), monthlyBreakdown, yearTotal };
};

// ═══════════════════════════════════════════════════════════════
// STUDENT — My Penalties (mobile + web)
// ═══════════════════════════════════════════════════════════════

export const getMyPenalties = async (schoolId, studentId, filters = {}) => {
    const query = { schoolId, studentId };
    if (filters.academicYear) query.academicYear = Number(filters.academicYear);

    const penalties = await StudentPenalty.find(query)
        .sort({ occurrenceDate: -1, createdAt: -1 })
        .lean();

    const records = penalties.map((p) => ({
        penaltyId: p._id,
        academicYear: p.academicYear,
        penaltyType: p.penaltyType,
        reason: p.reason,
        amount: p.amount,
        paidAmount: p.paidAmount,
        status: p.status,
        occurrenceDate: p.occurrenceDate,
    }));

    const summary = {
        totalAssigned: records.reduce((s, r) => s + r.amount, 0),
        totalPaid: records.reduce((s, r) => s + r.paidAmount, 0),
        totalPending: records.filter(r => r.status === "PENDING").reduce((s, r) => s + r.amount, 0),
    };

    return { summary, penalties: records };
};

