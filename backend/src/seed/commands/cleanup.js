// Command to cleanup demo data
import { cleanup as factoryCleanup } from "../lib/factory.js";
import logger from "../../config/logger.js";

/**
 * Runs the cleanup process to remove all demo data.
 * This command leverages the cleanup function from the factory.
 */
const runCleanup = async (args) => {
    logger.info("Starting demo data cleanup...");
    logger.info("=".repeat(50));

    // Optional: parse specific school codes to cleanup if provided as arguments
    const schoolCodes = args.filter(arg => !arg.startsWith('--')).map(arg => arg.toUpperCase());

    await factoryCleanup(schoolCodes.length > 0 ? schoolCodes : []);

    logger.info("=".repeat(50));
    logger.info("Demo data cleanup complete!");
};

export default runCleanup;
