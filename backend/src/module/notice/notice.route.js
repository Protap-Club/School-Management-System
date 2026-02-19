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
    params: {
        folder: 'protap/notices',
        resource_type: 'auto', // Handles images, PDFs, videos, docs
        allowed_formats: [
            'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
            'txt', 'csv', 'png', 'jpg', 'jpeg', 'mp4', 'mov', 'avi'
        ],
    },
});

const ALLOWED_MIMETYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed. Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV, PNG, JPG, JPEG, MP4, MOV, AVI"), false);
    }
};

const upload = multer({
    storage: noticeStorage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
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
