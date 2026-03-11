import Salary from "./Salary.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";

// ── Create Salary Entry ────────────────────────────────────────
export const createSalaryEntry = async (schoolId, data, userId) => {
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
        .populate("teacherId", "name email")
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

// ── Update Salary Status (Admin) ───────────────────────────────
export const updateSalaryStatus = async (schoolId, id, data) => {
    const salary = await Salary.findOne({ _id: id, schoolId });
    if (!salary) throw new NotFoundError("Salary record not found");

    if (data.status === "PAID") {
        salary.status = "PAID";
        salary.paidDate = data.paidDate || new Date();
    }

    if (data.remarks !== undefined) {
        salary.remarks = data.remarks;
    }

    await salary.save();
    logger.info(`Salary ${id} status updated to ${salary.status}`);
    return salary;
};
