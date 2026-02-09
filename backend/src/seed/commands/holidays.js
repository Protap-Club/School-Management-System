// Command to seed default Indian holidays
import { INDIAN_HOLIDAYS_2026 } from "../data/holidays.js";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

/**
 * Seeds default 2026 Indian holidays for all schools
 * This creates a shared calendar with national holidays and festivals
 */
const seedHolidays = async () => {
    logger.info("Starting Holiday Seed...");
    logger.info("=".repeat(50));

    try {
        // Get all schools
        const schools = await School.find({}).lean();

        if (schools.length === 0) {
            logger.warn("No schools found. Run demo seed first.");
            return;
        }

        let totalCreated = 0;

        for (const school of schools) {
            logger.info(`Seeding holidays for: ${school.name}`);

            // Clear existing holidays for this school
            await CalendarEvent.deleteMany({ schoolId: school._id });

            // Create holidays for this school
            const holidaysToCreate = INDIAN_HOLIDAYS_2026.map(holiday => ({
                ...holiday,
                start: new Date(holiday.start),
                end: new Date(holiday.end),
                schoolId: school._id,
                createdBy: null // System-generated
            }));

            await CalendarEvent.insertMany(holidaysToCreate);
            totalCreated += holidaysToCreate.length;

            logger.info(`  ✓ Created ${holidaysToCreate.length} holidays`);
        }

        logger.info("=".repeat(50));
        logger.info(`Holiday seed complete! Total: ${totalCreated} events across ${schools.length} schools`);

    } catch (error) {
        logger.error("Holiday seed failed:", error.message);
        throw error;
    }
};

export default seedHolidays;
