import express from "express";
import multer from "multer";
import cloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import { AppError, BadRequestError, ValidationError } from "../../utils/customError.js";
import {
    createAssignment,
    listAssignments,
    listSubmittedAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
    removeAttachment,
    submitAssignment,
    getMySubmission,
    listSubmissions,
    getAssignmentMetadata,
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

const ALLOWED_STUDENT_MIMETYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
];

const teacherUpload = multer({
    storage: assignmentStorage,
    fileFilter: (req, file, cb) => cb(null, true),
    limits: { fileSize: 10 * 1024 * 1024 },
});

const studentSubmissionUpload = multer({
    storage: assignmentStorage,
    fileFilter: (req, file, cb) => {
        if (ALLOWED_STUDENT_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new BadRequestError("File type not allowed. Supported: PDF, JPG, JPEG"), false);
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const withUploadHandling = (middleware, fileSizeMessage) => (req, res, next) => {
    middleware(req, res, (err) => {
        if (!err) {
            next();
            return;
        }

        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                next(new AppError(fileSizeMessage, 413, "PAYLOAD_TOO_LARGE"));
                return;
            }

            next(new ValidationError(err.message));
            return;
        }

        next(err);
    });
};

const router = express.Router();

router.use(requireFeature("assignment"));

router.get("/meta/metadata", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getAssignmentMetadata);
router.get("/student", checkRole([USER_ROLES.STUDENT]), listAssignments);
router.get("/submitted", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), listSubmittedAssignments);
router.get("/", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), listAssignments);
router.post(
    "/",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    withUploadHandling(teacherUpload.array("attachments", 5), "Attachment size must be 10MB or less"),
    validate(createAssignmentSchema),
    createAssignment
);

router.get("/:id", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(assignmentIdParamsSchema), getAssignment);
router.put(
    "/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    withUploadHandling(teacherUpload.array("attachments", 5), "Attachment size must be 10MB or less"),
    validate(updateAssignmentSchema),
    updateAssignment
);
router.delete("/:id", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(assignmentIdParamsSchema), deleteAssignment);

router.delete("/:id/attachments/:publicId", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(assignmentIdParamsSchema), removeAttachment);

router.post(
    "/:id/submit",
    checkRole([USER_ROLES.STUDENT]),
    withUploadHandling(
        studentSubmissionUpload.fields([
            { name: "file", maxCount: 1 },
            { name: "files", maxCount: 1 },
        ]),
        "Submission file size must be 10MB or less"
    ),
    validate(submitAssignmentSchema),
    submitAssignment
);
router.get("/:id/my-submission", checkRole([USER_ROLES.STUDENT]), validate(assignmentIdParamsSchema), getMySubmission);
router.get("/:id/submissions", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(assignmentIdParamsSchema), listSubmissions);

export default router;
