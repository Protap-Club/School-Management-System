import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import * as resultService from "./result.service.js";

export const getCompletedExams = asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const result = await resultService.getCompletedExams(req.schoolId, req.user, req.platform, page, pageSize);
    res.status(200).json({
        success: true,
        data: result,
    });
});

export const getExamStudents = asyncHandler(async (req, res) => {
    const result = await resultService.getExamStudents(
        req.schoolId,
        req.params.examId,
        req.user,
        req.platform
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

export const saveResult = asyncHandler(async (req, res) => {
    const result = await resultService.saveResult(req.schoolId, req.body, req.user);
    res.status(200).json({
        success: true,
        message: "Result saved successfully",
        data: result,
    });
    logger.info(`Result saved for exam=${req.body.examId} student=${req.body.studentId}`);
});

export const getExamResults = asyncHandler(async (req, res) => {
    const result = await resultService.getExamResults(
        req.schoolId,
        req.params.examId,
        req.user,
        req.platform
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

export const publishExamResults = asyncHandler(async (req, res) => {
    const result = await resultService.publishExamResults(
        req.schoolId,
        req.params.examId,
        req.user
    );

    res.status(200).json({
        success: true,
        message: "Results published successfully",
        data: result,
    });
});

export const getMyResults = asyncHandler(async (req, res) => {
    const result = await resultService.getMyResults(
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
