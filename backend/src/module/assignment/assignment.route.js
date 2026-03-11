import express from "express";
import multer from "multer";
import cloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import {
    createAssignment,
    listAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
    removeAttachment,
    submitAssignment,
    getMySubmission,
    listSubmissions,
} from "./assignment.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createAssignmentSchema,
    updateAssignmentSchema,
    assignmentIdParamsSchema,
    submitAssignmentSchema,
} from "./assignment.validation.js";

// Cloudinary storage scoped to school assignments folder
const assignmentStorage = cloudinaryStorage({
    cloudinary: { v2: cloudinary },
    params: function (req, file, cb) {
        const folder = req.schoolId
            ? `schools/${req.schoolId}/assignments`
            : "schools/default/assignments";
        cb(null, {
            folder,
            resource_type: "raw",
            access_mode: "public",
        });
    },
});

const ALLOWED_MIMETYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error("File type not allowed. Supported: PDF, DOC, DOCX, JPG, JPEG, PNG"),
            false
        );
    }
};

const upload = multer({
    storage: assignmentStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

router.use(requireFeature("assignment"));

// Assignment CRUD (teacher/admin — web only)
router.get("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), listAssignments);
router.post("/", checkWebOnly, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), upload.array("attachments", 5), validate(createAssignmentSchema), createAssignment);

router.get("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(assignmentIdParamsSchema), getAssignment);
router.put("/:id", checkWebOnly, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), upload.array("attachments", 5), validate(updateAssignmentSchema), updateAssignment);
router.delete("/:id", checkWebOnly, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(assignmentIdParamsSchema), deleteAssignment);

// Attachment management (teacher/admin — web only)
router.delete("/:id/attachments/:publicId", checkWebOnly, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(assignmentIdParamsSchema), removeAttachment);

// Submission routes (student submits via mobile, teacher/admin views on web)
router.post("/:id/submit", checkRole([USER_ROLES.STUDENT]), upload.array("files", 5), validate(submitAssignmentSchema), submitAssignment);
router.get("/:id/my-submission", checkRole([USER_ROLES.STUDENT]), validate(assignmentIdParamsSchema), getMySubmission);
router.get("/:id/submissions", checkWebOnly, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(assignmentIdParamsSchema), listSubmissions);

export default router;
