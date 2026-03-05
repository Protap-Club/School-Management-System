import express from "express";
import multer from "multer";
import cloudinaryStorage from "multer-storage-cloudinary";
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
const noticeStorage = cloudinaryStorage({
    cloudinary: { v2: cloudinary },
    folder: function (req, file, cb) {
        // Namespace per school: schools/{schoolId}/notices
        const folder = req.schoolId ? `schools/${req.schoolId}/notices` : 'schools/default/notices';
        cb(null, folder);
    },
    params: {
        resource_type: 'auto',
        access_mode: 'public'
    }
});

const ALLOWED_MIMETYPES = [
    "application/pdf",
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/vnd.ms-powerpoint", // ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.ms-excel", // xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "video/mp4",
    "video/quicktime", // mov
    "video/x-msvideo", // avi
    "text/csv",
    "text/plain" // txt
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed. Supported: PDF, DOC, DOCX, JPG, JPEG, PNG, PPT, PPTX, XLSX, XLS, MP4, MOV, AVI, CSV, TXT"), false);
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
router.get("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), getNotices);
router.post("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), upload.single("attachment"), validate(createNoticeSchema), createNotice);
router.get("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(noticeIdParamsSchema), getNoticeById);
router.delete("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(noticeIdParamsSchema), deleteNotice);

export default router;
