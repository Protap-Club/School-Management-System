import Salary from "./Salary.model.js";
import User from "../user/model/User.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { createAuditLog } from "../audit/audit.service.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";

// ── Create Salary Entry ────────────────────────────────────────
export const createSalaryEntry = async (schoolId, data, userId) => {
    // Block salary creation for archived teachers
    const teacher = await User.findById(data.teacherId).select("isArchived").lean();
    if (teacher?.isArchived) {
        throw new BadRequestError("Cannot create salary entry for an archived teacher");
    }

    const exists = await Salary.exists({
        schoolId,
        teacherId: data.teacherId,
        month: data.month,
        year: data.year,
    });

    if (exists) {
        throw new ConflictError(
            `Salary entry already exists for this teacher for month ${data.month}/${data.year}`
        );
    }

    const salary = await Salary.create({
        schoolId,
        teacherId: data.teacherId,
        month: data.month,
        year: data.year,
        amount: data.amount,
        remarks: data.remarks,
        createdBy: userId,
    });

    logger.info(`Salary entry created: ${salary._id} for teacher ${data.teacherId} (${data.month}/${data.year})`);
    return salary;
};

// ── Get Salary Entries (Admin) ─────────────────────────────────
export const getSalaryEntries = async (schoolId, filters = {}) => {
    const query = { schoolId };

    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.year) query.year = Number(filters.year);
    if (filters.month) query.month = Number(filters.month);
    if (filters.status) query.status = filters.status;

    const salaries = await Salary.find(query)
        .populate("teacherId", "name email contactNo isArchived")
        .sort({ year: -1, month: -1 })
        .lean();

    return salaries;
};

// ── Get Teacher's Own Salary (Teacher) ─────────────────────────
export const getTeacherSalary = async (schoolId, teacherId, year) => {
    const query = { schoolId, teacherId };
    if (year) query.year = Number(year);

    const salaries = await Salary.find(query)
        .sort({ year: -1, month: -1 })
        .lean();

    // Compute summary
    const summary = {
        totalRecords: salaries.length,
        totalAmount: salaries.reduce((s, r) => s + r.amount, 0),
        totalPaid: salaries.filter(r => r.status === "PAID").reduce((s, r) => s + r.amount, 0),
        totalPending: salaries.filter(r => r.status === "PENDING").reduce((s, r) => s + r.amount, 0),
    };

    // Get expected salary from teacher profile
    const profile = await TeacherProfile.findOne({ userId: teacherId, schoolId })
        .select("expectedSalary")
        .lean();

    summary.expectedMonthlySalary = profile?.expectedSalary || 0;

    return { summary, salaries };
};

// ── Update Salary Status/Amount (Admin) ────────────────────────
export const updateSalaryStatus = async (schoolId, id, data, user, metadata) => {
    const salary = await Salary.findOne({ _id: id, schoolId });
    if (!salary) throw new NotFoundError("Salary record not found");

    // Capture BEFORE state for diff
    const before = salary.toObject();

    // If status is being changed to PAID
    if (data.status === "PAID") {
        if (salary.status === "PAID") {
            throw new ConflictError(`Salary for ${salary.month}/${salary.year} is already marked as PAID`);
        }
        salary.status = "PAID";
        salary.paidDate = data.paidDate || new Date();
    }

    // Amount can ONLY be updated if status is currently PENDING
    if (data.amount !== undefined) {
        if (salary.status !== "PENDING") {
            throw new BadRequestError("Cannot update amount for a salary that is already PAID");
        }
        salary.amount = data.amount;
    }

    if (data.remarks !== undefined) {
        salary.remarks = data.remarks;
    }

    await salary.save();
    logger.info(`Salary ${id} updated (status: ${salary.status}, amount: ${salary.amount})`);

    // Capture AFTER state and build diff
    const after = salary.toObject();
    const IGNORED_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'schoolId', 'teacherId'];
    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
        if (IGNORED_FIELDS.includes(key)) continue;
        const prev = JSON.stringify(before[key]);
        const next = JSON.stringify(after[key]);
        if (prev !== next) {
            changes.push({ field: key, before: before[key], after: after[key] });
        }
    }

    // Fire-and-forget audit log
    createAuditLog({
        schoolId,
        action: AUDIT_ACTIONS.SALARY_UPDATED,
        actorId: user._id,
        actorRole: user.role,
        targetModel: "Salary",
        targetId: salary._id,
        description: `Updated salary record for teacher (month: ${salary.month}/${salary.year}, status: ${salary.status})`,
        metadata: { changes },
        ip: metadata?.ip,
        userAgentString: metadata?.userAgent,
    }).catch(() => {});

    return salary;
};
