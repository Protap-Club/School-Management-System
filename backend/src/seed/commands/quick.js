// Command to set up quick test data
import { USER_ROLES } from "../../constants/userRoles.js";
import { createSchool, addUsers, cleanup, DEMO_PASSWORD } from "../lib/factory.js"; // Using the refactored factory
import logger from "../../config/logger.js";

/**
 * Runs a quick test setup.
 * Creates one test school with minimal users for rapid testing.
 */
const runQuickSetup = async () => {
    logger.info("Starting Quick Test Setup...");
    logger.info("=".repeat(50));

    // Cleanup any existing test data before starting fresh.
    await cleanup(["TEST"]); // Cleanup specific "TEST" school

    // Create 1 test school
    await createSchool({
        name: "Test School",
        code: "TEST",
        address: "123 Test Street",
        contactPhone: "+91-9999999999",
        superAdminEmail: "vraj@test.com" // Ensure specific super admin email
    });

    // Add 1 admin
    await addUsers("TEST", [
        { name: "Test Admin", email: "admin@test.com", department: "Administration", employeeId: "TEST-ADM-001" }
    ], USER_ROLES.ADMIN);

    // Add 2 teachers (different classes)
    await addUsers("TEST", [
        { name: "Teacher 10A", email: "teacher10a@test.com", standard: "10th", section: "A", employeeId: "TEST-TCH-001" },
        { name: "Teacher 10B", email: "teacher10b@test.com", standard: "10th", section: "B", employeeId: "TEST-TCH-002" }
    ], USER_ROLES.TEACHER);

    // Add 8 students (4 per class)
    await addUsers("TEST", [
        { name: "Student 1", email: "student1@test.com", rollNumber: "TEST001", standard: "10th", section: "A", year: 2024 },
        { name: "Student 2", email: "student2@test.com", rollNumber: "TEST002", standard: "10th", section: "A", year: 2024 },
        { name: "Student 3", email: "student3@test.com", rollNumber: "TEST003", standard: "10th", section: "A", year: 2024 },
        { name: "Student 4", email: "student4@test.com", rollNumber: "TEST004", standard: "10th", section: "A", year: 2024 },
        { name: "Student 5", email: "student5@test.com", rollNumber: "TEST005", standard: "10th", section: "B", year: 2024 },
        { name: "Student 6", email: "student6@test.com", rollNumber: "TEST006", standard: "10th", section: "B", year: 2024 },
        { name: "Student 7", email: "student7@test.com", rollNumber: "TEST007", standard: "10th", section: "B", year: 2024 },
        { name: "Student 8", email: "student8@test.com", rollNumber: "TEST008", standard: "10th", section: "B", year: 2024 }
    ], USER_ROLES.STUDENT);

    logger.info("=".repeat(50));
    logger.info("Quick setup complete!");
    logger.info("Login Credentials (Password: %s):", DEMO_PASSWORD);
    logger.info("   Super Admin: vraj@test.com");
    logger.info("   Admin: admin@test.com");
    logger.info("   Teacher 10A: teacher10a@test.com (sees 4 students)");
    logger.info("   Teacher 10B: teacher10b@test.com (sees 4 students)");
    logger.info("=".repeat(50));
};

export default runQuickSetup;
