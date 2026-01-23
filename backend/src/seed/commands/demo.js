// Command to set up full demo data
import { USER_ROLES } from "../../constants/userRoles.js";
import { DEMO_SCHOOLS, DEMO_USERS } from "../data/demo.js";
import { createSchool, addUsers, cleanup, DEMO_PASSWORD } from "../lib/factory.js"; // Using the refactored factory
import logger from "../../config/logger.js";

/**
 * Runs the full demo setup.
 * Creates multiple schools and populates them with various types of users (admins, teachers, students).
 */
const runDemo = async () => {
    logger.info("Starting Full Demo Setup...");
    logger.info("=".repeat(50));

    // Cleanup any existing demo data before starting fresh.
    await cleanup();

    // Create schools defined in DEMO_SCHOOLS.
    for (const schoolData of DEMO_SCHOOLS) {
        await createSchool(schoolData);
    }

    // Add users (admins, teachers, students) to each created school.
    for (const [code, users] of Object.entries(DEMO_USERS)) {
        if (users.admins?.length) await addUsers(code, users.admins, USER_ROLES.ADMIN);
        if (users.teachers?.length) await addUsers(code, users.teachers, USER_ROLES.TEACHER);
        if (users.students?.length) await addUsers(code, users.students, USER_ROLES.STUDENT);
    }

    logger.info("=".repeat(50));
    logger.info("Demo setup complete!");
    logger.info("Login Credentials (Password: %s):", DEMO_PASSWORD);
    logger.info("   DPS Super Admin: vraj@dps.com");
    logger.info("   DAV Super Admin: vraj@dav.com");
    logger.info("=".repeat(50));
};

export default runDemo;
