import { Notice, NoticeGroup } from "../../module/notice/Notice.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const noticeData = loadSeedJson("notices.json");

const seedNotices = async () => {
  logger.info("=== Seeding Notices ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  await Notice.deleteMany({ schoolId: school._id });
  await NoticeGroup.deleteMany({ schoolId: school._id });

  let seededNotices = 0;
  for (const notice of noticeData.notices) {
    const creator = await User.findOne({ email: notice.createdByEmail, schoolId: school._id }).select("_id");
    if (!creator) {
      logger.warn(`Missing notice creator user: ${notice.createdByEmail}`);
      continue;
    }

    await Notice.create({
      schoolId: school._id,
      createdBy: creator._id,
      title: notice.title || "",
      message: notice.message,
      type: notice.type || "notice",
      recipientType: notice.recipientType || "all",
      recipients: notice.recipients || [],
      status: notice.status || "sent",
      isActive: notice.isActive !== false,
    });
    seededNotices += 1;
  }

  let seededGroups = 0;
  for (const group of noticeData.noticeGroups) {
    const creator = await User.findOne({ email: group.createdByEmail, schoolId: school._id }).select("_id");
    if (!creator) {
      logger.warn(`Missing group creator user: ${group.createdByEmail}`);
      continue;
    }
    const members = await User.find({
      schoolId: school._id,
      email: { $in: group.memberEmails || [] },
    }).select("_id");

    await NoticeGroup.create({
      schoolId: school._id,
      createdBy: creator._id,
      name: group.name,
      members: members.map((m) => m._id),
      isActive: group.isActive !== false,
    });
    seededGroups += 1;
  }

  logger.info(`Notices seeded: ${seededNotices}`);
  logger.info(`Notice groups seeded: ${seededGroups}`);
};

export default seedNotices;

