import * as examinationService from "./examination.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// CREATE EXAM — Admin (TERM_EXAM) or Teacher (CLASS_TEST)
// ═══════════════════════════════════════════════════════════════

export const createExam = asyncHandler(async (req, res) => {
    const result = await examinationService.createExam(req.schoolId, req.body, req.user);
    res.status(201).json({
        success: true,
        message: "Exam created successfully",
        data: result,
    });
    logger.info(`Exam created: ${result.examType} — "${result.name}"`);
});

// ═══════════════════════════════════════════════════════════════
// GET EXAMS — List (auto-filtered by role)
// ═══════════════════════════════════════════════════════════════

export const getExams = asyncHandler(async (req, res) => {
    const result = await examinationService.getExams(req.schoolId, req.query, req.user);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EXAM BY ID
// ═══════════════════════════════════════════════════════════════

export const getExamById = asyncHandler(async (req, res) => {
    const result = await examinationService.getExamById(req.schoolId, req.params.id, req.user);
    res.status(200).json({
        success: true,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE EXAM
// ═══════════════════════════════════════════════════════════════

export const updateExam = asyncHandler(async (req, res) => {
    const result = await examinationService.updateExam(req.schoolId, req.params.id, req.body, req.user);
    res.status(200).json({
        success: true,
        message: "Exam updated successfully",
        data: result,
    });
});

export const uploadSyllabusDocument = asyncHandler(async (req, res) => {
    const result = await examinationService.uploadSyllabusDocument( req.schoolId, req.params.id, req.file, req.user);

    res.status(200).json({
        success: true,
        message: "Syllabus document uploaded successfully",
        data: result,
    });
});

export const uploadScheduleAttachments = asyncHandler(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const result = await examinationService.uploadScheduleAttachments(
        req.schoolId,
        req.params.id,
        req.params.scheduleItemId,
        files,
        req.user
    );

    res.status(200).json({
        success: true,
        message: "Schedule attachments uploaded successfully",
        data: result,
    });
});

export const patchScheduleSyllabus = asyncHandler(async (req, res) => {
    const result = await examinationService.patchScheduleSyllabus(
        req.schoolId,
        req.params.id,
        req.params.scheduleItemId,
        req.body,
        req.user
    );

    res.status(200).json({
        success: true,
        message: "Schedule syllabus updated successfully",
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE EXAM
// ═══════════════════════════════════════════════════════════════

export const deleteExam = asyncHandler(async (req, res) => {
    await examinationService.deleteExam(req.schoolId, req.params.id, req.user);
    res.status(200).json({
        success: true,
        message: "Exam deleted successfully",
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE STATUS — Publish / Complete / Cancel
// ═══════════════════════════════════════════════════════════════

export const updateStatus = asyncHandler(async (req, res) => {
    const result = await examinationService.updateStatus(
        req.schoolId,
        req.params.id,
        req.body.status,
        req.user,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );
    res.status(200).json({
        success: true,
        message: `Exam status changed to ${result.status}`,
        data: result,
    });
});

// ═══════════════════════════════════════════════════════════════
// STUDENT — My Exams (termExams + classTests)
// ═══════════════════════════════════════════════════════════════

export const getMyExams = asyncHandler(async (req, res) => {
    const result = await examinationService.getMyExams(req.schoolId, req.user._id, req.query);
    res.status(200).json({
        success: true,
        data: result,
    });
});
