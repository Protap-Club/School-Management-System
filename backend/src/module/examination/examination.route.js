import express from "express";
import multer from "multer";
import cloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import { AppError, BadRequestError, ValidationError } from "../../utils/customError.js";
import { createExam, getExams, getExamById, updateExam, uploadSyllabusDocument, uploadScheduleAttachments, patchScheduleSyllabus, deleteExam, updateStatus, getMyExams,
} from "./examination.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {createExamSchema,updateExamSchema,getExamsQuerySchema,examIdParamsSchema,updateStatusSchema,myExamsQuerySchema,
    scheduleAttachmentParamsSchema,
    scheduleSyllabusUpdateSchema,
} from "./examination.validation.js";

const router = express.Router();

const examDocumentStorage = cloudinaryStorage({
    cloudinary: { v2: cloudinary },
    params: function (req, file, cb) {
        const folder = req.schoolId
            ? `schools/${req.schoolId}/examinations/syllabus`
            : "schools/default/examinations/syllabus";

        cb(null, {
            folder,
            resource_type: "raw",
            access_mode: "public",
        });
    },
});

const ALLOWED_DOCUMENT_MIMETYPES = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/rtf","application/vnd.oasis.opendocument.text","text/plain",
];

const ALLOWED_SCHEDULE_ATTACHMENT_MIMETYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
];

const ALLOWED_SCHEDULE_ATTACHMENT_EXTENSIONS = [
    "jpg", "jpeg", "pdf", "png", "doc", "docx", "xlsx", "xls", "csv", "txt",
];

const getFileExtension = (fileName = "") => {
    if (!fileName.includes(".")) return "";
    return fileName.split(".").pop().toLowerCase();
};

const syllabusUpload = multer({
    storage: examDocumentStorage,
    fileFilter: (req, file, cb) => {
        if (ALLOWED_DOCUMENT_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(
            new BadRequestError(
                "File type not allowed. Supported formats: PDF, DOC, DOCX, RTF, ODT, TXT."
            ),
            false
        );
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const scheduleAttachmentUpload = multer({
    storage: examDocumentStorage,
    fileFilter: (req, file, cb) => {
        const extension = getFileExtension(file.originalname);
        if (
            ALLOWED_SCHEDULE_ATTACHMENT_MIMETYPES.includes(file.mimetype) ||
            ALLOWED_SCHEDULE_ATTACHMENT_EXTENSIONS.includes(extension)
        ) {
            cb(null, true);
            return;
        }

        cb(
            new BadRequestError(
                "File type not allowed. Supported formats: JPG, JPEG, PDF, PNG, DOC, DOCX, XLSX, XLS, CSV, TXT."
            ),
            false
        );
    },
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
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

            if (err.code === "LIMIT_FILE_COUNT") {
                next(new ValidationError("Maximum 10 attachments allowed per exam paper"));
                return;
            }

            next(new ValidationError(err.message));
            return;
        }

        next(err);
    });
};

// Global middleware for all examination routes
router.use(requireFeature("examination"));

// ── Student Route (mobile + web) ─────────────────────────────
router.get(
    "/my-exams",
    checkRole([USER_ROLES.STUDENT]),
    validate(myExamsQuerySchema),
    getMyExams
);

// ── Shared: List & View (mobile + web) ───────────────────────
router.get(
    "/",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(getExamsQuerySchema),
    getExams
);

router.get(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    getExamById
);

// ── Admin + Teacher: Create / Update / Delete ──────────────────────
router.post(
    "/",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(createExamSchema),
    createExam
);

router.put(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(updateExamSchema),
    updateExam
);

router.post(
    "/:id/syllabus-document",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    withUploadHandling(
        syllabusUpload.single("syllabusDocument"),
        "Syllabus document size must be 10MB or less"
    ),
    uploadSyllabusDocument
);

router.post(
    "/:id/schedule/:scheduleItemId/attachments",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(scheduleAttachmentParamsSchema),
    withUploadHandling(
        scheduleAttachmentUpload.array("attachments", 10),
        "Each attachment must be 10MB or less"
    ),
    uploadScheduleAttachments
);

router.patch(
    "/:id/schedule/:scheduleItemId/syllabus",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(scheduleSyllabusUpdateSchema),
    patchScheduleSyllabus
);

router.delete(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    deleteExam
);

router.patch(
    "/:id/status",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(updateStatusSchema),
    updateStatus
);

export default router;
