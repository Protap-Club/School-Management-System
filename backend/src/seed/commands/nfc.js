/**
 * Seed Command: Link NFC Tags
 * 
 * Links NFC tag UIDs to student accounts using the data
 * defined in ../data/nfcTags.js
 * 
 * Usage: node src/seed/index.js nfc
 */

import User from "../../module/user/model/User.model.js";
import { NFC_TAGS } from "../data/nfcTags.js";
import logger from "../../config/logger.js";

const runNfcLink = async () => {
    logger.info("═".repeat(50));
    logger.info("🏷️  NFC Tag Linking");
    logger.info("═".repeat(50));

    let linked = 0;
    let skipped = 0;
    let failed = 0;

    for (const tag of NFC_TAGS) {
        try {
            // Check if tag is already assigned to someone
            const existing = await User.findOne({ nfcUid: tag.nfcUid }).select("name email").lean();
            if (existing) {
                logger.info(`⏭️  Skip: ${tag.label} — tag already linked to ${existing.name} (${existing.email})`);
                skipped++;
                continue;
            }

            // Find student by email and link the tag
            const student = await User.findOneAndUpdate(
                { email: tag.studentEmail, role: "student" },
                { $set: { nfcUid: tag.nfcUid } },
                { new: true }
            ).select("name email nfcUid").lean();

            if (student) {
                logger.info(`✅ Linked: ${student.name} (${student.email}) → ${tag.nfcUid}`);
                linked++;
            } else {
                logger.warn(`❌ Not found: ${tag.studentEmail} — student may not exist in DB`);
                failed++;
            }
        } catch (err) {
            logger.error(`❌ Error linking ${tag.label}: ${err.message}`);
            failed++;
        }
    }

    logger.info("═".repeat(50));
    logger.info(`Done! Linked: ${linked} | Skipped: ${skipped} | Failed: ${failed}`);
    logger.info("═".repeat(50));
};

export default runNfcLink;
