import * as assignmentService from "./assignment.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

// ── Assignment Controllers ──────────────────────────────────────

// POST /assignments
// Create a new assignment (multipart/form-data with optional attachments)
export const createAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.createAssignment(
        req.schoolId,
        req.user._id,
        req.user.role,
        req.body,
        req.files || []
    );

    res.status(201).json({
        success: true,
        message: "Assignment created successfully",
        data: result,
    });

    logger.info(`Assignment created by ${req.user._id}: ${result._id}`);
});

// GET /assignments
// List assignments (role-scoped: teacher sees own class, student sees own class + active only)
export const listAssignments = asyncHandler(async (req, res) => {
    const result = await assignmentService.listAssignments(
        req.schoolId,
        req.user._id,
        req.user.role,
        req.platform,
        req.query
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// GET /assignments/:id
// Get a single assignment by ID
export const getAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.getAssignment(
        req.schoolId,
        req.params.id
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// PUT /assignments/:id
// Update an assignment (multipart/form-data with optional new attachments)
export const updateAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.updateAssignment(
        req.schoolId,
        req.params.id,
        req.user._id,
        req.user.role,
        req.body,
        req.files || []
    );

    res.status(200).json({
        success: true,
        message: "Assignment updated successfully",
        data: result,
    });

    logger.info(`Assignment updated by ${req.user._id}: ${req.params.id}`);
});

// DELETE /assignments/:id
// Delete an assignment and cascade-clean submissions + Cloudinary files
export const deleteAssignment = asyncHandler(async (req, res) => {
    await assignmentService.deleteAssignment(
        req.schoolId,
        req.params.id,
        req.user._id,
        req.user.role
    );

    logger.info(`Assignment deleted by ${req.user._id}: ${req.params.id}`);
    res.status(204).end();
});

// DELETE /assignments/:id/attachments/:publicId
// Remove a single attachment from an assignment
export const removeAttachment = asyncHandler(async (req, res) => {
    const result = await assignmentService.removeAttachment(
        req.schoolId,
        req.params.id,
        req.user._id,
        req.user.role,
        req.params.publicId
    );

    res.status(200).json({
        success: true,
        message: "Attachment removed successfully",
        data: result,
    });
});

// ── Submission Controllers ──────────────────────────────────────

// POST /assignments/:id/submit
// Student submits (or re-submits) an assignment (multipart/form-data)
export const submitAssignment = asyncHandler(async (req, res) => {
    const result = await assignmentService.submitAssignment(
        req.schoolId,
        req.params.id,
        req.user._id,
        req.files || []
    );

    res.status(201).json({
        success: true,
        message: "Assignment submitted successfully",
        data: result,
    });

    logger.info(`Submission by student ${req.user._id} for assignment ${req.params.id}`);
});

// GET /assignments/:id/my-submission
// Get the logged-in student's submission for an assignment
export const getMySubmission = asyncHandler(async (req, res) => {
    const result = await assignmentService.getMySubmission(
        req.schoolId,
        req.params.id,
        req.user._id
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

// GET /assignments/:id/submissions
// List all submissions for an assignment (teacher/admin view)
export const listSubmissions = asyncHandler(async (req, res) => {
    const result = await assignmentService.listSubmissions(
        req.schoolId,
        req.params.id,
        req.user._id,
        req.user.role
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});
