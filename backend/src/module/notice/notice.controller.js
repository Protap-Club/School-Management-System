import * as noticeService from "./notice.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

// Notice Controllers


//  POST /notices
//  Create a new notice (multipart/form-data with optional attachment)

export const createNotice = asyncHandler(async (req, res) => {
    const result = await noticeService.createNotice(
        req.schoolId,
        req.user._id,
        req.body,
        req.file || null
    );

    res.status(201).json({
        success: true,
        message: "Notice sent successfully",
        data: result,
    });

    logger.info(`Notice created by ${req.user._id}: ${result._id}`);
});

// GET /notices
//  Get all notices with optional query filters (type, sentTo, date)

export const getNotices = asyncHandler(async (req, res) => {
    const filters = {
        type: req.query.type || "all",
        sentTo: req.query.sentTo || "all",
        date: req.query.date || "all",
    };

    const platform = req.platform;

    const result = await noticeService.getNotices(req.user, platform, filters);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// GET /notices/received
//  Get notices received by the logged-in user (for bell icon / notifications page)

export const getReceivedNotices = asyncHandler(async (req, res) => {
    const result = await noticeService.getReceivedNotices(req.schoolId, req.user);

    res.status(200).json({
        success: true,
        data: result,
    });
});

export const deleteReceivedNotice = asyncHandler(async (req, res) => {
    const result = await noticeService.deleteReceivedNotice(req.schoolId, req.params.id, req.user);

    res.status(200).json({
        success: true,
        message: "Notice removed from received list",
        data: result,
    });
});

export const bulkDeleteReceivedNotices = asyncHandler(async (req, res) => {
    const result = await noticeService.bulkDeleteReceivedNotices(req.schoolId, req.body.ids, req.user);

    res.status(200).json({
        success: true,
        message: "Selected notices removed from received list",
        data: result,
    });
});

// GET /notices/:id
// Get a single notice by ID

export const getNoticeById = asyncHandler(async (req, res) => {
    const result = await noticeService.getNoticeById(req.schoolId, req.params.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// DELETE /notices/:id
// Soft-delete a notice

export const deleteNotice = asyncHandler(async (req, res) => {
    const result = await noticeService.deleteNotice(
        req.schoolId,
        req.params.id,
        req.user._id
    );

    logger.info(`Notice deleted: ${req.params.id}`);
    res.status(204).end();
});


// Group Controllers


// GET /notices/groups
// Get all groups for the logged-in user

export const getGroups = asyncHandler(async (req, res) => {
    const result = await noticeService.getGroups(req.schoolId, req.user._id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// POST /notices/groups
// Create a new notice group

export const createGroup = asyncHandler(async (req, res) => {
    const result = await noticeService.createGroup(
        req.schoolId,
        req.user._id,
        req.body
    );

    res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: result,
    });

    logger.info(`Group created by ${req.user._id}: ${result._id}`);
});

// DELETE /notices/groups/:groupId
// Soft-delete a notice group

export const deleteGroup = asyncHandler(async (req, res) => {
    const result = await noticeService.deleteGroup(
        req.schoolId,
        req.params.groupId,
        req.user._id
    );

    logger.info(`Group deleted: ${req.params.groupId}`);
    res.status(204).end();
});


// Acknowledgment Controllers


// POST /notices/:id/acknowledge
// Receiver records their acknowledgment of a notice

export const acknowledgeNotice = asyncHandler(async (req, res) => {
    const result = await noticeService.acknowledgeNotice(
        req.schoolId,
        req.params.id,
        req.user,
        req.body.responseMessage,
        req.files || []
    );

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

// GET /notices/:id/acknowledgments
// Sender retrieves who has and hasn't acknowledged their notice

export const getAcknowledgments = asyncHandler(async (req, res) => {
    const result = await noticeService.getAcknowledgments(
        req.schoolId,
        req.params.id,
        req.user._id
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// GET /notices/my-students
// Returns ALL students assigned to the requesting teacher (no pagination cap)

export const getTeacherStudents = asyncHandler(async (req, res) => {
    const result = await noticeService.getTeacherStudents(req.schoolId, req.user._id);

    res.status(200).json({
        success: true,
        data: result,
    });
});
