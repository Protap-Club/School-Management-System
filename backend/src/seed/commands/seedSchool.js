import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const { school } = loadSeedJson("schools.json");

const seedSchool = async () => {
  logger.info("=== Seeding School ===");

  await School.deleteMany({ code: school.code });
  const created = await School.create(school);

  logger.info(`Created school: ${created.name} (${created.code}) -> ${created._id}`);
  return created;
};

export default seedSchool;

