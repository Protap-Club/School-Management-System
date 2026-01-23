// Command to create a specific student for testing purposes
import { createUser, findUserByEmail, DEMO_PASSWORD } from "../lib/factory.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";
import { parseArgs } from 'node:util'; // For parsing command line arguments
import SchoolModel from "../../models/School.model.js"; // Import SchoolModel

const createTestStudent = async (args) => {
    // Define expected arguments for the command
    const options = {
        name: { type: 'string', short: 'n' },
        email: { type: 'string', short: 'e' },
        nfc: { type: 'string', short: 'u' }, // nfcUid
    };

    const { values } = parseArgs({ args, options });

    const studentName = values.name;
    const studentEmail = values.email;
    const nfcUid = values.nfc;

    if (!studentName || !studentEmail) {
        logger.error("Usage: create-student --name <student-name> --email <student-email> [--nfc <nfc-uid>]");
        throw new Error("Student name and email are required.");
    }

    logger.info(`Attempting to create test student: ${studentName} (${studentEmail}) with NFC UID: ${nfcUid || 'none'}`);

    // Get all schools. For a test student, we'll use the first available school.
    // Ideally, a `--schoolCode` option could be added for more control.
    const school = await SchoolModel.findOne({}); // Find one school for assignment
    if (!school) {
        logger.warn('No schools found! Please create a school first using `seed quick` or `seed demo`.');
        throw new Error('No schools found to assign student to.');
    }

    logger.info(`Using school: ${school.name} (${school._id}) for student creation.`);

    // Check if student already exists.
    const existingUser = await findUserByEmail(studentEmail);

    if (existingUser) {
        logger.info(`User ${studentEmail} already exists. Updating NFC UID if provided.`);
        if (nfcUid) {
            existingUser.nfcUid = nfcUid.trim();
            await existingUser.save();
            logger.info(`NFC tag ${nfcUid} linked to existing student ${existingUser._id}.`);
        } else {
            logger.info(`No NFC UID provided. Existing student ${studentEmail} remains unchanged.`);
        }
        return { studentId: existingUser._id, studentEmail: existingUser.email, nfcUid: existingUser.nfcUid };
    } else {
        // Create new student
        const result = await createUser({
            name: studentName,
            email: studentEmail,
            role: USER_ROLES.STUDENT,
            schoolId: school._id,
            profileData: {
                rollNumber: 'NFC-TEST-001', // Placeholder roll number
                standard: '10th',
                year: 2026,
                section: 'A',
                guardianName: 'Test Guardian',
                guardianContact: '+91 9876543210'
            },
            password: DEMO_PASSWORD, // Use demo password from factory
            mustChangePassword: true
        });

        if (result.success) {
            const newStudent = result.user;
            if (nfcUid) {
                newStudent.nfcUid = nfcUid.trim();
                await newStudent.save(); // Save the newStudent to update NFC UID
                logger.info(`Student ${studentName} created and NFC tag ${nfcUid} linked.`);
            } else {
                 logger.info(`Student ${studentName} created successfully.`);
            }
           
            logger.info(`Student ID: ${newStudent._id}, Email: ${newStudent.email}, School: ${school.name}, NFC UID: ${newStudent.nfcUid || 'none'}`);
            return { studentId: newStudent._id, studentEmail: newStudent.email, nfcUid: newStudent.nfcUid };
        } else {
            logger.error(`Failed to create student ${studentName}: ${result.error}`);
            throw new Error(`Failed to create student: ${result.error}`);
        }
    }
};

export default createTestStudent;