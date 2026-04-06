import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const { schools } = loadSeedJson("schools.json");

const seedSchool = async () => {
  logger.info("=== Seeding Schools ===");

  const created = [];
  for (const school of schools) {
    await School.deleteMany({ code: school.code });
    const doc = await School.create(school);
    logger.info(`Created school: ${doc.name} (${doc.code}) -> ${doc._id}`);
    created.push(doc);
  }

  logger.info(`Schools seeded: ${created.length}`);
  return created;
};

export default seedSchool;
