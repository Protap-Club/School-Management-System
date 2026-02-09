import express from "express";
import { getMySchedule } from "../timetable/timetable.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";

const router = express.Router();

router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature('timetable'));

// GET /api/v1/schedule/me
router.get("/me", getMySchedule);

export default router;
