import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
import { checkAuth } from "../../middlewares/auth.middleware.js";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// Multer config for notice attachments
// ═══════════════════════════════════════════════════════════════

const noticesDir = path.join(__dirname, "../../../uploads/notices");

// Ensure upload directory exists
if (!fs.existsSync(noticesDir)) {
    fs.mkdirSync(noticesDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, noticesDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `notice_${uniqueSuffix}${ext}`);
    },
});

const ALLOWED_MIMETYPES = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    // Images
    "image/png",
    "image/jpeg",
    "image/jpg",
    // Videos
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
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for notice attachments
});

// ═══════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════

const router = express.Router();

// Global middleware for all notice routes
router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature("notice"));

// --- Group routes (MUST be before /:id to avoid conflict) ---

// GET /api/v1/notices/groups
router.get(
    "/groups",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    getGroups
);

// POST /api/v1/notices/groups
router.post(
    "/groups",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(createGroupSchema),
    createGroup
);

// DELETE /api/v1/notices/groups/:groupId
router.delete(
    "/groups/:groupId",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(groupIdParamsSchema),
    deleteGroup
);

// --- Notice routes ---

// GET /api/v1/notices
router.get(
    "/",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    getNotices
);

// POST /api/v1/notices (multipart/form-data)
router.post(
    "/",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    upload.single("attachment"),
    validate(createNoticeSchema),
    createNotice
);

// GET /api/v1/notices/received (open to ALL authenticated users)
router.get(
    "/received",
    getReceivedNotices
);

// GET /api/v1/notices/:id
router.get(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(noticeIdParamsSchema),
    getNoticeById
);

// DELETE /api/v1/notices/:id
router.delete(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(noticeIdParamsSchema),
    deleteNotice
);

export default router;
