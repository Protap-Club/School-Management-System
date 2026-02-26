// Seeds Navrachna school from schools.json
import { createRequire } from "module";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const { school } = require("../data/schools.json");

const seedSchool = async () => {
    logger.info("═══ Seeding School ═══");

    // Wipe existing school with same code to avoid duplicates
    await School.deleteMany({ code: school.code });

    const created = await School.create(school);
    logger.info(`Created school: ${created.name} (${created.code}) → ${created._id}`);

    return created;
};

export default seedSchool;
