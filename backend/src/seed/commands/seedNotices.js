import { Notice, NoticeGroup } from "../../module/notice/Notice.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const noticeData = loadSeedJson("notices.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const seedNotices = async () => {
  logger.info("=== Seeding Notices ===");

  for (const schoolDef of schoolsDef) {
    const school = await School.findOne({ code: schoolDef.code });
    if (!school) continue;

    await Notice.deleteMany({ schoolId: school._id });
    await NoticeGroup.deleteMany({ schoolId: school._id });

    let seededNotices = 0;
    for (const notice of noticeData.notices) {
      // Find sender by role — admin or teacher
      const senderRole = notice.senderRole || "admin";
      const sender = await User.findOne({ schoolId: school._id, role: senderRole }).select("_id");
      if (!sender) {
        logger.warn(`[${schoolDef.code}] No ${senderRole} found for notice: ${notice.title}`);
        continue;
      }

      // Map JSON recipientType to model enum: all, classes, users, students, groups
      const typeMap = { student: "students", teacher: "users", teachers: "users" };
      let recipientType = notice.recipientType || "all";
      recipientType = typeMap[recipientType] || recipientType;

      await Notice.create({
        schoolId: school._id,
        createdBy: sender._id,
        title: notice.title || "",
        message: notice.content,
        type: "notice",
        recipientType,
        recipients: [],
        status: "sent",
        isActive: true,
      });
      seededNotices += 1;
    }

    logger.info(`[${schoolDef.code}] Notices seeded: ${seededNotices}`);
  }
};

export default seedNotices;
