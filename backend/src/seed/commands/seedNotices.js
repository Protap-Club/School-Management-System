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

    const records = [];
    let seededNotices = 0;
    
    for (const notice of noticeData.notices) {
      const senderRole = notice.senderRole || "admin";
      const sender = await User.findOne({ schoolId: school._id, role: senderRole }).select("_id");
      
      if (!sender) {
        logger.warn(`[${schoolDef.code}] No ${senderRole} found for notice: ${notice.title}`);
        continue;
      }

      const typeMap = { student: "students", teacher: "users", teachers: "users" };
      let recipientType = notice.recipientType || "all";
      recipientType = typeMap[recipientType] || recipientType;

      const startDate = new Date(notice.startDate || Date.now());
      const endDate = new Date(notice.endDate || Date.now());
      const now = new Date();

      // Backdate the posting time a bit before the event starts
      const createdAt = new Date(startDate.getTime() - (24 * 60 * 60 * 1000 * 2));
      
      // Auto-expire notices if the event has completely concluded
      const isActive = endDate.getTime() >= now.getTime();

      records.push({
        schoolId: school._id,
        createdBy: sender._id,
        title: notice.title || "",
        message: notice.content,
        type: "notice",
        recipientType,
        recipients: [],
        status: "sent",
        isActive,
        createdAt,
        updatedAt: createdAt
      });
      seededNotices += 1;
    }

    if (records.length > 0) {
        await Notice.insertMany(records, { ordered: false });
    }

    logger.info(`[${schoolDef.code}] Notices seeded: ${seededNotices}`);
  }
};

export default seedNotices;
