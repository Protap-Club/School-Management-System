import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.js";
import {
    createNotice,
    getNotices,
    getNoticeById,
    getReceivedNotices,
    deleteNotice,
    getGroups,
    createGroup,
    deleteGroup,
} from "./notice.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createNoticeSchema,
    getNoticesQuerySchema,
    noticeIdParamsSchema,
    createGroupSchema,
    groupIdParamsSchema,
} from "./notice.validation.js";

// Cloudinary Storage for Notice Attachments
const noticeStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        // Namespace per school: schools/{schoolId}/notices
        const folder = req.schoolId ? `schools/${req.schoolId}/notices` : 'schools/default/notices';
        return {
            folder,
            resource_type: 'auto', // Handles documents like PDF/Word
            allowed_formats: [
                'pdf', 'doc', 'docx'
            ],
        };
    }
});

const ALLOWED_MIMETYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed. Supported: PDF, DOC, DOCX"), false);
    }
};

const upload = multer({
    storage: noticeStorage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit as requested
});

const router = express.Router();

router.use(extractSchoolId);
router.use(requireFeature("notice"));

// Groups (before /:id to avoid conflict)
router.get("/groups", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getGroups);
router.post("/groups", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createGroupSchema), createGroup);
router.delete("/groups/:groupId", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(groupIdParamsSchema), deleteGroup);

// Received notices (all authenticated)
router.get("/received", getReceivedNotices);

// Notices CRUD
router.get("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getNotices);
router.post("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), upload.single("attachment"), validate(createNoticeSchema), createNotice);
router.get("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(noticeIdParamsSchema), getNoticeById);
router.delete("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(noticeIdParamsSchema), deleteNotice);

export default router;
