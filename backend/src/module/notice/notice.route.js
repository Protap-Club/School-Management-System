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

// Multer config
const noticesDir = path.join(__dirname, "../../../uploads/notices");
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
    storage,
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
