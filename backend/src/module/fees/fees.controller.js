import * as feesService from "./fees.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// ADMIN — Fee Structure CRUD
// ═══════════════════════════════════════════════════════════════

export const createFeeStructure = asyncHandler(async (req, res) => {
    const result = await feesService.createFeeStructure(req.schoolId, req.body, req.user._id);
    res.status(201).json({
        success: true,
        message: "Fee structure created",
        data: result,
    });
    logger.info(`Fee structure created: ${result.feeType} for ${result.standard}-${result.section}`);
});

export const getFeeStructures = asyncHandler(async (req, res) => {
    const result = await feesService.getFeeStructures(req.schoolId, req.query, req.user);
    res.status(200).json({
        success: true,
        data: result,
    });
});

export const updateFeeStructure = asyncHandler(async (req, res) => {
    const result = await feesService.updateFeeStructure(req.schoolId, req.params.id, req.body, req.user);
    res.status(200).json({
        success: true,
        message: "Fee structure updated",
        data: result,
    });
});

export const deleteFeeStructure = asyncHandler(async (req, res) => {
    await feesService.deleteFeeStructure(req.schoolId, req.params.id, req.user);
    res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — Assignment Generation & Management
// ═══════════════════════════════════════════════════════════════

export const generateAssignments = asyncHandler(async (req, res) => {
    const { month, year } = req.body;
    const result = await feesService.generateAssignments(
        req.schoolId,
        req.params.id,
        month,
        year,
        req.user._id,
        req.user
    );
    res.status(201).json({
        success: true,
        message: `Assignments generated: ${result.created} created, ${result.skipped} skipped`,
        data: result,
    });
    logger.info(`Assignments generated for structure ${req.params.id}: ${result.created}/${result.total}`);
});

export const updateAssignment = asyncHandler(async (req, res) => {
    const result = await feesService.updateAssignment(req.schoolId, req.params.id, req.body, req.user);
    res.status(200).json({
        success: true,
        message: "Fee assignment updated",
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — Payment Recording
// ═══════════════════════════════════════════════════════════════

export const recordPayment = asyncHandler(async (req, res) => {
    const result = await feesService.recordPayment(
        req.schoolId,
        req.params.id,
        req.body,
        req.user._id,
        req.user,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );
    res.status(201).json({
        success: true,
        message: `Payment recorded: ${result.payment.receiptNumber}`,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — Dashboard & Reports
// ═══════════════════════════════════════════════════════════════

export const getClassFeeOverview = asyncHandler(async (req, res) => {
    const { standard, section } = req.params;
    const { academicYear, month } = req.query;

    const result = await feesService.getClassFeeOverview(
        req.schoolId,
        academicYear,
        month,
        standard,
        section
    );
    res.status(200).json({
        success: true,
        data: result,
    });
});

export const getAllClassesFeeOverview = asyncHandler(async (req, res) => {
    const { academicYear, month } = req.query;
    const result = await feesService.getAllClassesFeeOverview(req.schoolId, academicYear, month);
    res.status(200).json({
        success: true,
        data: result,
    });
});

export const getYearlyFeeSummary = asyncHandler(async (req, res) => {
    const { academicYear } = req.query;
    const result = await feesService.getYearlyFeeSummary(req.schoolId, academicYear);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN + TEACHER — Student Fee History
// ═══════════════════════════════════════════════════════════════

export const getStudentFeeHistory = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const result = await feesService.getStudentFeeHistory(req.schoolId, studentId, academicYear);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// STUDENT — My Fees (mobile + web)
// ═══════════════════════════════════════════════════════════════

export const getMyFees = asyncHandler(async (req, res) => {
    const result = await feesService.getMyFees(
        req.schoolId,
        req.user._id,
        req.query,
        req.platform
    );
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ── Fee Type Management ───────────────────────────────────────

export const getFeeTypes = asyncHandler(async (req, res) => {
    const types = await feesService.getFeeTypes(req.schoolId);
    res.status(200).json({
        success: true,
        data: types,
    });
});

export const createFeeType = asyncHandler(async (req, res) => {
    const feeType = await feesService.createFeeType(req.schoolId, req.body, req.user._id);
    res.status(201).json({
        success: true,
        data: feeType,
    });
});
