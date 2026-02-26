// Seeds notices and notice groups from notices.json
import { createRequire } from "module";
import { Notice, NoticeGroup } from "../../module/notice/Notice.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const noticeData = require("../data/notices.json");

const seedNotices = async () => {
    logger.info("═══ Seeding Notices ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    await Notice.deleteMany({ schoolId: school._id });
    await NoticeGroup.deleteMany({ schoolId: school._id });

    // Notices — resolve createdByEmail → userId
    for (const n of noticeData.notices) {
        const creator = await User.findOne({ email: n.createdByEmail, schoolId: school._id });
        if (!creator) { logger.warn(`Notice creator not found: ${n.createdByEmail}`); continue; }

        await Notice.create({
            schoolId: school._id,
            createdBy: creator._id,
            title: n.title,
            message: n.message,
            type: n.type,
            recipientType: n.recipientType,
            recipients: n.recipients,
            status: n.status,
            isActive: n.isActive,
        });
    }
    logger.info(`Notices → ${noticeData.notices.length}`);

    // Notice groups — resolve creator + member emails → userIds
    for (const g of noticeData.noticeGroups) {
        const creator = await User.findOne({ email: g.createdByEmail, schoolId: school._id });
        if (!creator) { logger.warn(`Group creator not found: ${g.createdByEmail}`); continue; }

        const members = await User.find({
            email: { $in: g.memberEmails },
            schoolId: school._id,
        }).select("_id");

        await NoticeGroup.create({
            schoolId: school._id,
            createdBy: creator._id,
            name: g.name,
            members: members.map(m => m._id),
            isActive: g.isActive,
        });
    }
    logger.info(`Notice groups → ${noticeData.noticeGroups.length}`);
};

export default seedNotices;
