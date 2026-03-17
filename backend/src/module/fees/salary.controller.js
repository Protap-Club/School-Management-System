import * as salaryService from "./salary.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

// ── Create Salary Entry (Admin) ────────────────────────────────
export const createSalaryEntry = asyncHandler(async (req, res) => {
    const result = await salaryService.createSalaryEntry(
        req.schoolId,
        req.body,
        req.user._id
    );
    res.status(201).json({
        success: true,
        message: "Salary entry created",
        data: result,
    });
    logger.info(`Salary entry created for teacher ${req.body.teacherId}`);
});

// ── Get Salary Entries (Admin) ─────────────────────────────────
export const getSalaryEntries = asyncHandler(async (req, res) => {
    const result = await salaryService.getSalaryEntries(req.schoolId, req.query);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ── Get Teacher's Own Salary ───────────────────────────────────
export const getTeacherSalary = asyncHandler(async (req, res) => {
    const result = await salaryService.getTeacherSalary(
        req.schoolId,
        req.user._id,
        req.query.year
    );
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ── Update Salary Status (Admin) ───────────────────────────────
export const updateSalaryStatus = asyncHandler(async (req, res) => {
    logger.info({ msg: "updateSalaryStatus request", params: req.params, body: req.body });
    const result = await salaryService.updateSalaryStatus(
        req.schoolId,
        req.params.id,
        req.body
    );
    res.status(200).json({
        success: true,
        message: "Salary status updated",
        data: result,
    });
});
