import User from "./model/User.model.js";
import StudentProfile from "./model/StudentProfile.model.js";
import TeacherProfile from "./model/TeacherProfile.model.js";
import School from "../school/School.model.js";
import RefreshToken from "../auth/RefreshToken.model.js";
import { Assignment } from "../assignment/Assignment.model.js";
import Exam from "../examination/Exam.model.js";
import { TimetableEntry } from "../timetable/Timetable.model.js";
import { PROFILE_CONFIG } from "../../config/profiles.js";
import { sendCredentialsEmail } from "../../utils/email.util.js";
import { USER_ROLES, canManageRole, VIEWABLE_ROLES } from "../../constants/userRoles.js";
import { buildAccessQuery } from "../../utils/access.util.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import logger from "../../config/logger.js";
import { generatePassword } from "../../utils/password.util.js";
import {
    assertClassSectionExists,
    assertClassSectionListExists,
} from "../../utils/classSection.util.js";
import {
    assertTeacherClassAssignmentsAvailable,
    ensureActiveTeacher,
    findTeacherClassConflicts,
    formatClassSectionLabel,
    getPrimaryTeacherAssignedClass,
    mergeTeacherAssignedClasses,
    normalizeTeacherAssignedClasses,
} from "../../utils/teacher.util.js";

const getTeacherAssignmentsFromPayload = (userData = {}) => {
    if (Array.isArray(userData.assignedClasses) && userData.assignedClasses.length > 0) {
        return userData.assignedClasses;
    }

    if (userData.standard || userData.section) {
        return [{
            standard: userData.standard,
            section: userData.section,
            subjects: [],
        }];
    }

    return [];
};

const normalizeUserClassAssignments = async (schoolId, role, userData, options = {}) => {
    const { excludeUserId = null } = options;

    if (role === USER_ROLES.STUDENT && (userData.standard || userData.section)) {
        const normalizedStudentClass = await assertClassSectionExists(
            schoolId,
            userData.standard,
            userData.section,
            { message: "Student class-section is not configured in Settings" }
        );

        userData.standard = normalizedStudentClass.standard;
        userData.section = normalizedStudentClass.section;
    }

    if (role !== USER_ROLES.TEACHER) {
        return;
    }

    const requestedAssignedClasses = Array.isArray(userData.assignedClasses)
        ? userData.assignedClasses
        : [];

    if (requestedAssignedClasses.length > 0) {
        const normalizedAssignedClasses = await assertClassSectionListExists(
            schoolId,
            requestedAssignedClasses,
            { message: "One or more teacher assigned classes are not configured in Settings" }
        );
        userData.assignedClasses = normalizeTeacherAssignedClasses(
            normalizedAssignedClasses.map((item) => {
                const original = requestedAssignedClasses.find(
                    (candidate) =>
                        String(candidate?.standard || "").trim() === item.standard &&
                        String(candidate?.section || "").trim().toUpperCase() === item.section
                );

                return {
                    ...item,
                    subjects: Array.isArray(original?.subjects) ? original.subjects : [],
                };
            })
        );
    } else if (userData.standard || userData.section) {
        const normalizedTeacherClass = await assertClassSectionExists(
            schoolId,
            userData.standard,
            userData.section,
            { message: "Teacher class-section is not configured in Settings" }
        );

        userData.standard = normalizedTeacherClass.standard;
        userData.section = normalizedTeacherClass.section;
    }

    const teacherAssignments = getTeacherAssignmentsFromPayload(userData);
    if (teacherAssignments.length > 0) {
        await assertTeacherClassAssignmentsAvailable(schoolId, teacherAssignments, {
            excludeUserIds: excludeUserId ? [excludeUserId] : [],
        });
    }
};

const buildTeacherArchiveSummary = async (schoolId, teacherIds = []) => {
    const profiles = await TeacherProfile.find({
        schoolId,
        userId: { $in: teacherIds },
    })
        .select("userId assignedClasses")
        .lean();

    const assignedClasses = profiles.flatMap((profile) =>
        normalizeTeacherAssignedClasses(profile.assignedClasses || [])
    );
    const uniqueAssignedClasses = normalizeTeacherAssignedClasses(assignedClasses);

    const [activeAssignmentCount, activeOwnedExamCount, activeInvigilationCount, timetableEntryCount] =
        await Promise.all([
            Assignment.countDocuments({
                schoolId,
                createdBy: { $in: teacherIds },
                status: "active",
            }),
            Exam.countDocuments({
                schoolId,
                createdBy: { $in: teacherIds },
                isActive: true,
                status: { $in: ["DRAFT", "PUBLISHED"] },
            }),
            Exam.countDocuments({
                schoolId,
                isActive: true,
                status: { $in: ["DRAFT", "PUBLISHED"] },
                "schedule.assignedTeacher": { $in: teacherIds },
            }),
            TimetableEntry.countDocuments({
                schoolId,
                teacherId: { $in: teacherIds },
            }),
        ]);

    return {
        profiles,
        uniqueAssignedClasses,
        assignedClassCount: uniqueAssignedClasses.length,
        assignedClassLabels: uniqueAssignedClasses.map((item) => formatClassSectionLabel(item)),
        activeAssignmentCount,
        activeOwnedExamCount,
        activeInvigilationCount,
        timetableEntryCount,
        requiresReplacement:
            uniqueAssignedClasses.length > 0 ||
            activeAssignmentCount > 0 ||
            activeOwnedExamCount > 0 ||
            activeInvigilationCount > 0 ||
            timetableEntryCount > 0,
    };
};

const assertReplacementTeacherCanTakeClasses = async (
    schoolId,
    replacementTeacherId,
    classSections = [],
    archivedTeacherIds = []
) => {
    if (!classSections.length) {
        return;
    }

    const conflicts = await findTeacherClassConflicts(schoolId, classSections, {
        excludeUserIds: [replacementTeacherId, ...archivedTeacherIds],
    });

    if (conflicts.length > 0) {
        const firstConflict = conflicts[0];
        throw new ConflictError(
            `Class ${firstConflict.classLabel} is already assigned to ${firstConflict.teacherName}`,
            "CLASS_TEACHER_ALREADY_ASSIGNED",
            { conflicts }
        );
    }
};

const assertReplacementTeacherHasNoTimetableConflicts = async (
    schoolId,
    sourceTeacherIds = [],
    replacementTeacherId
) => {
    const sourceEntries = await TimetableEntry.find({
        schoolId,
        teacherId: { $in: sourceTeacherIds },
    })
        .select("dayOfWeek timeSlotId")
        .lean();

    if (sourceEntries.length === 0) {
        return;
    }

    const uniquePairs = new Map();
    sourceEntries.forEach((entry) => {
        const key = `${entry.dayOfWeek}::${String(entry.timeSlotId)}`;
        if (!uniquePairs.has(key)) {
            uniquePairs.set(key, {
                dayOfWeek: entry.dayOfWeek,
                timeSlotId: entry.timeSlotId,
            });
        }
    });

    const conflicts = await TimetableEntry.find({
        schoolId,
        teacherId: replacementTeacherId,
        $or: [...uniquePairs.values()],
    })
        .populate("timetableId", "standard section")
        .populate("timeSlotId", "slotNumber")
        .lean();

    if (conflicts.length === 0) {
        return;
    }

    const firstConflict = conflicts[0];
    const classLabel = firstConflict.timetableId
        ? formatClassSectionLabel(firstConflict.timetableId)
        : "another class";
    const slotLabel = firstConflict.timeSlotId?.slotNumber
        ? `slot ${firstConflict.timeSlotId.slotNumber}`
        : "the same time slot";

    throw new ConflictError(
        `Replacement teacher is already busy on ${firstConflict.dayOfWeek} in ${classLabel} (${slotLabel})`,
        "REPLACEMENT_TEACHER_TIMETABLE_CONFLICT",
        {
            conflicts: conflicts.map((entry) => ({
                dayOfWeek: entry.dayOfWeek,
                slotNumber: entry.timeSlotId?.slotNumber || null,
                standard: entry.timetableId?.standard || null,
                section: entry.timetableId?.section || null,
            })),
        }
    );
};

const transferTeacherResponsibilities = async (
    schoolId,
    sourceProfiles = [],
    replacementProfile = null
) => {
    const teacherIds = sourceProfiles.map((profile) => profile.userId);
    if (teacherIds.length === 0 || !replacementProfile) {
        return {
            classesTransferred: 0,
            timetableEntriesTransferred: 0,
            assignmentsTransferred: 0,
            examsTransferred: 0,
            invigilationAssignmentsTransferred: 0,
        };
    }

    const incomingClasses = sourceProfiles.flatMap((profile) => profile.assignedClasses || []);
    replacementProfile.assignedClasses = mergeTeacherAssignedClasses(
        replacementProfile.assignedClasses || [],
        incomingClasses
    );
    await replacementProfile.save();

    const [
        timetableTransferResult,
        assignmentTransferResult,
        ownedExamTransferResult,
        invigilationTransferResult,
    ] = await Promise.all([
        TimetableEntry.updateMany(
            { schoolId, teacherId: { $in: teacherIds } },
            { $set: { teacherId: replacementProfile.userId } }
        ),
        Assignment.updateMany(
            { schoolId, createdBy: { $in: teacherIds }, status: "active" },
            { $set: { createdBy: replacementProfile.userId } }
        ),
        Exam.updateMany(
            {
                schoolId,
                createdBy: { $in: teacherIds },
                isActive: true,
                status: { $in: ["DRAFT", "PUBLISHED"] },
            },
            { $set: { createdBy: replacementProfile.userId, createdByRole: USER_ROLES.TEACHER } }
        ),
        Exam.updateMany(
            {
                schoolId,
                isActive: true,
                status: { $in: ["DRAFT", "PUBLISHED"] },
                "schedule.assignedTeacher": { $in: teacherIds },
            },
            {
                $set: {
                    "schedule.$[slot].assignedTeacher": replacementProfile.userId,
                },
            },
            {
                arrayFilters: [{ "slot.assignedTeacher": { $in: teacherIds } }],
            }
        ),
    ]);

    return {
        classesTransferred: normalizeTeacherAssignedClasses(incomingClasses).length,
        timetableEntriesTransferred: timetableTransferResult.modifiedCount || 0,
        assignmentsTransferred: assignmentTransferResult.modifiedCount || 0,
        examsTransferred: ownedExamTransferResult.modifiedCount || 0,
        invigilationAssignmentsTransferred: invigilationTransferResult.modifiedCount || 0,
    };
};


// CREATE USER

export const createUser = async (creator, userData) => {
    const { name, email, role, skipEmail } = userData;

    // Hierarchy check: creator can only create roles below their own
    if (!canManageRole(creator.role, role)) {
        throw new ForbiddenError(`You cannot create a user with role '${role}'. You can only create roles below your own.`);
    }

    // School context — always scoped to creator's school
    const targetSchoolId = userData.schoolId || creator.schoolId;

    await normalizeUserClassAssignments(targetSchoolId, role, userData);

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError("Email already registered");

    // Generate secure password
    const plainPassword = userData.password || generatePassword(12);
    const config = PROFILE_CONFIG[role];
    const school = await School.findById(targetSchoolId).select("name").lean();

    // Step 1: Create User
    const newUser = await User.create({
        ...userData,
        password: plainPassword, // User model .pre('save') hashes this
        schoolId: targetSchoolId,
        createdBy: creator._id
    });

    // Step 2: Create Role-Specific Profile (manual rollback on failure)
    if (config) {
        try {
            await config.model.create({
                userId: newUser._id,
                schoolId: targetSchoolId,
                ...config.extractFields(userData)
            });
        } catch (profileError) {
            // Roll back: remove the user if profile creation fails
            await User.deleteOne({ _id: newUser._id });
            throw profileError;
        }
    }

    // Step 3: Send welcome email (fire-and-forget, non-blocking)
    if (!skipEmail) {
        sendCredentialsEmail({
            to: email,
            name,
            role,
            password: plainPassword,
            schoolName: school?.name
        }).catch(err => logger.error({ err, email }, "Failed to send credentials email"));
    }

    const { _id, name: n, email: e, role: r, schoolId: s, createdBy: cb } = newUser;
    return { user: { _id, name: n, email: e, role: r, schoolId: s, createdBy: cb } };
};

// GET USERS (with pagination, role scoping, and teacher class filtering)
export const getUsers = async (creator, filters = {}) => {

    // 1. INPUT VALIDATION & SANITIZATION
    const page = Math.max(0, filters.page || 0);
    const maxPageSize = [USER_ROLES.TEACHER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(creator.role) ? 5000 : 100;
    const pageSize = Math.min(maxPageSize, Math.max(1, filters.pageSize || 25));
    const { page: _, pageSize: __, ...queryFilters } = filters;

    // 2. BUILD BASE QUERY WITH ACCESS CONTROL
    const query = buildAccessQuery(creator, queryFilters);

    // 3. TEACHER-SPECIFIC CLASS FILTERING
    if (creator.role === USER_ROLES.TEACHER) {
        const assignedClasses = await getTeacherAssignedClasses(creator._id);

        if (!assignedClasses.length) {
            return { totalCount: 0, users: [], pagination: { page, pageSize, totalPages: 0 } };
        }

        // Only filter if querying students (teachers can view their own profile)
        if (!query.role || query.role === USER_ROLES.STUDENT ||
            (query.role.$in && query.role.$in.includes(USER_ROLES.STUDENT))) {

            const matchingStudents = await StudentProfile.find({
                schoolId: creator.schoolId,
                $or: assignedClasses.map(cls => ({
                    standard: cls.standard,
                    section: cls.section
                }))
            }).select("userId").lean();

            const allowedStudentIds = matchingStudents.map(sp => sp.userId.toString());

            // Merge with existing _id filter if present
            if (query._id) {
                const existingIds = Array.isArray(query._id.$in)
                    ? query._id.$in.map(id => id.toString())
                    : [query._id.toString()];

                const intersection = existingIds.filter(id => allowedStudentIds.includes(id));
                query._id = { $in: intersection };
            } else {
                query._id = { $in: allowedStudentIds };
            }
        }
    }

    // 4. COUNT TOTAL MATCHING DOCUMENTS
    const totalCount = await User.countDocuments(query);

    // Early return if no results
    if (totalCount === 0) {
        return {
            totalCount: 0,
            users: [],
            pagination: { page, pageSize, totalPages: 0 }
        };
    }

    // 5. FETCH USERS WITH CONDITIONAL POPULATION
    const queryRole = typeof query.role === 'string' ? query.role : null;

    let userQuery = User.find(query)
        .select("-password -__v")
        .populate("schoolId", "name code")
        .sort({ createdAt: -1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .lean();

    // Conditional profile population for performance
    if (queryRole === USER_ROLES.STUDENT) {
        userQuery = userQuery.populate("studentProfile");
    } else if (queryRole === USER_ROLES.TEACHER) {
        userQuery = userQuery.populate("teacherProfile");
    } else if (queryRole === USER_ROLES.ADMIN) {
        userQuery = userQuery.populate("adminProfile");
    } else {
        // Mixed roles — populate all profiles
        userQuery = userQuery
            .populate("studentProfile")
            .populate("teacherProfile")
            .populate("adminProfile");
    }

    const users = await userQuery;

    // 6. RETURN FORMATTED RESPONSE
    return {
        totalCount,
        users: users.map(formatUserResponse),
        pagination: {
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
        }
    };
};

// GET USER BY ID (single user detail view)
export const getUserById = async (creator, userId) => {
    // 1. FETCH USER WITH SCHOOL ISOLATION
    const user = await User.findOne({
        _id: userId,
        schoolId: creator.schoolId // Enforce school isolation
    })
        .select("-password -__v")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) {
        throw new NotFoundError("User not found or you do not have access to this user");
    }

    // 3. ROLE HIERARCHY ENFORCEMENT
    // Verify the caller is allowed to view this user's role (hierarchy check)
    const allowedRoles = VIEWABLE_ROLES[creator.role] || [];

    if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(`You are not authorized to view users with role '${user.role}'`);
    }

    // 4. TEACHER-SPECIFIC CLASS VALIDATION
    if (creator.role === USER_ROLES.TEACHER && user.role === USER_ROLES.STUDENT) {
        const assignedClasses = await getTeacherAssignedClasses(creator._id);

        if (!assignedClasses.length) {
            throw new ForbiddenError("You have no assigned classes and cannot view this student");
        }

        // Get student's class information
        const studentProfile = user.studentProfile;
        if (!studentProfile) {
            throw new NotFoundError("Student profile not found");
        }

        // Check if student belongs to any of teacher's assigned classes
        const isAssigned = assignedClasses.some(cls =>
            cls.standard === studentProfile.standard &&
            cls.section === studentProfile.section
        );

        if (!isAssigned) {
            throw new ForbiddenError("This student is not in your assigned classes");
        }
    }

    // 5. RETURN SANITIZED USER DATA
    return formatUserResponse(user);
};

// GET MY PROFILE (own profile — accessible from both web & mobile)
export const getMyProfile = async (userId) => {
    // 1. FETCH USER WITH PROFILES
    const user = await User.findById(userId)
        .select("-password -__v")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) {
        throw new NotFoundError("User not found");
    }

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNo: user.contactNo,
        schoolId: user.schoolId,
        isActive: user.isActive,
        profile: user.studentProfile || user.teacherProfile || user.adminProfile || null
    };
};

// TOGGLE ARCHIVE STATUS (soft delete / restore)
export const toggleArchive = async (creator, userIds, isArchived, options = {}) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const replacementTeacherId = options.replacementTeacherId || null;

    // 2. BUILD QUERY WITH ACCESS CONTROL
    const query = buildAccessQuery(creator, {
        userIds: ids,
        isArchived: !isArchived // Find users in the OPPOSITE state
    });

    // 3. FETCH AND VALIDATE TARGET USERS
    const targetUsers = await User.find(query).select("_id role name").lean();

    if (targetUsers.length === 0) {
        throw new NotFoundError(
            `No ${!isArchived ? 'archived' : 'active'} users found to ${isArchived ? 'archive' : 'restore'}`
        );
    }

    // 4. ROLE HIERARCHY VERIFICATION
    // Ensure creator can MANAGE all target roles
    const forbiddenUsers = targetUsers.filter(u => !canManageRole(creator.role, u.role));

    if (forbiddenUsers.length > 0) {
        const forbiddenRoles = [...new Set(forbiddenUsers.map(u => u.role))];
        throw new ForbiddenError(
            `You cannot ${isArchived ? 'archive' : 'restore'} users with roles: ${forbiddenRoles.join(', ')}`
        );
    }

    // 5. PREVENT SELF-ARCHIVING
    const isSelfArchiving = targetUsers.some(u => u._id.toString() === creator._id.toString());
    if (isSelfArchiving && isArchived) {
        throw new ForbiddenError("You cannot archive your own account");
    }

    const teacherTargetIds = targetUsers
        .filter((user) => user.role === USER_ROLES.TEACHER)
        .map((user) => user._id);

    let replacementTeacher = null;
    let replacementProfile = null;
    let teacherTransferSummary = {
        classesTransferred: 0,
        timetableEntriesTransferred: 0,
        assignmentsTransferred: 0,
        examsTransferred: 0,
        invigilationAssignmentsTransferred: 0,
    };

    if (isArchived && teacherTargetIds.length > 0) {
        const archiveSummary = await buildTeacherArchiveSummary(creator.schoolId, teacherTargetIds);

        if (archiveSummary.requiresReplacement && !replacementTeacherId) {
            throw new BadRequestError(
                "This teacher still has active classes or academic work. Please assign a temporary replacement teacher before archiving.",
                "TEACHER_REPLACEMENT_REQUIRED",
                archiveSummary
            );
        }

        if (replacementTeacherId) {
            if (teacherTargetIds.some((id) => String(id) === String(replacementTeacherId))) {
                throw new BadRequestError("Replacement teacher must be different from the archived teacher");
            }

            replacementTeacher = await ensureActiveTeacher(creator.schoolId, replacementTeacherId, {
                message: "Replacement teacher not found or is inactive",
            });

            await assertReplacementTeacherCanTakeClasses(
                creator.schoolId,
                replacementTeacher._id,
                archiveSummary.uniqueAssignedClasses,
                teacherTargetIds
            );
            replacementProfile =
                await TeacherProfile.findOne({
                    userId: replacementTeacher._id,
                    schoolId: creator.schoolId,
                }) ||
                await TeacherProfile.create({
                    userId: replacementTeacher._id,
                    schoolId: creator.schoolId,
                    assignedClasses: [],
                });

            teacherTransferSummary = await transferTeacherResponsibilities(
                creator.schoolId,
                archiveSummary.profiles,
                replacementProfile
            );
        }
    }

    if (!isArchived && teacherTargetIds.length > 0) {
        const restoringProfiles = await TeacherProfile.find({
            schoolId: creator.schoolId,
            userId: { $in: teacherTargetIds },
        })
            .select("userId assignedClasses")
            .lean();

        const duplicateAssignments = new Map();
        restoringProfiles.forEach((profile) => {
            const assignedClass = getPrimaryTeacherAssignedClass(profile.assignedClasses || []);
            if (!assignedClass) {
                return;
            }

                const classKey = `${assignedClass.standard}::${assignedClass.section}`;
                if (!duplicateAssignments.has(classKey)) {
                    duplicateAssignments.set(classKey, []);
                }

                duplicateAssignments.get(classKey).push(String(profile.userId));
        });

        const duplicateRestoreClass = [...duplicateAssignments.entries()].find(
            ([, teacherIds]) => teacherIds.length > 1
        );

        if (duplicateRestoreClass) {
            const [classKey] = duplicateRestoreClass;
            const [standard, section] = classKey.split("::");
            throw new ConflictError(
                `Cannot restore multiple teachers because class ${formatClassSectionLabel({ standard, section })} would end up with more than one class teacher`,
                "CLASS_TEACHER_ALREADY_ASSIGNED"
            );
        }

        const conflicts = await findTeacherClassConflicts(
            creator.schoolId,
            restoringProfiles
                .map((profile) => getPrimaryTeacherAssignedClass(profile.assignedClasses || []))
                .filter(Boolean),
            { excludeUserIds: teacherTargetIds }
        );

        if (conflicts.length > 0) {
            const firstConflict = conflicts[0];
            throw new ConflictError(
                `Cannot restore teacher because class ${firstConflict.classLabel} is already assigned to ${firstConflict.teacherName}`,
                "CLASS_TEACHER_ALREADY_ASSIGNED",
                { conflicts }
            );
        }
    }

    // 6. PERFORM UPDATE
    const updateData = { isArchived };

    if (isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = creator._id;
        updateData.isActive = false;
    } else {
        updateData.archivedAt = null;
        updateData.archivedBy = null;
        updateData.isActive = true;
    }

    const verifiedIds = targetUsers.map(u => u._id);
    const result = await User.updateMany(
        { _id: { $in: verifiedIds } },
        { $set: updateData }
    );

    // Revoke all refresh tokens for archived users (immediate session invalidation)
    if (isArchived) {
        await RefreshToken.updateMany(
            { userId: { $in: verifiedIds }, isRevoked: false },
            { $set: { isRevoked: true, expiresAt: new Date() } }
        );
    }

    // 7. LOG AND RETURN
    logger.info({
        action: isArchived ? 'archive' : 'restore',
        modifiedCount: result.modifiedCount,
        performedBy: creator._id,
        targetIds: verifiedIds
    }, `Users ${isArchived ? 'archived' : 'restored'}`);

    return {
        modifiedCount: result.modifiedCount,
        requestedCount: ids.length,
        notFoundCount: ids.length - targetUsers.length,
        replacementTeacherId: replacementTeacher?._id || null,
        teacherTransferSummary,
    };
};

// UPDATE TEACHER PROFILE (e.g. expectedSalary)
export const updateTeacherProfile = async (creator, userId, data) => {
    // Only admins can update profiles in this way
    if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(creator.role)) {
        throw new ForbiddenError("Only admins can update teacher profiles");
    }

    const user = await User.findOne({ _id: userId, schoolId: creator.schoolId });
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== USER_ROLES.TEACHER) throw new BadRequestError("User is not a teacher");

    const updatedProfile = await TeacherProfile.findOneAndUpdate(
        { userId, schoolId: creator.schoolId },
        { $set: data },
        { new: true, runValidators: true, upsert: true }
    );

    if (!updatedProfile) throw new NotFoundError("Teacher profile not found");

    logger.info(`Teacher profile updated for user ${userId} by ${creator._id}`);
    return updatedProfile;
};

// UPDATE USER (admin/super admin)
export const updateUser = async (creator, userId, payload = {}) => {
    if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(creator.role)) {
        throw new ForbiddenError("Only admins can update users");
    }

    const user = await User.findOne({ _id: userId, schoolId: creator.schoolId });
    if (!user) throw new NotFoundError("User not found");

    if (!canManageRole(creator.role, user.role)) {
        throw new ForbiddenError(`You cannot update a user with role '${user.role}'.`);
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.email !== undefined) updates.email = payload.email;
    if (payload.contactNo !== undefined) updates.contactNo = payload.contactNo;

    if (updates.email && updates.email !== user.email) {
        const existing = await User.exists({ email: updates.email, _id: { $ne: userId } });
        if (existing) throw new ConflictError("Email already registered");
    }

    if (Object.keys(updates).length > 0) {
        Object.assign(user, updates);
        await user.save();
    }

    const profileInput = payload.profile || null;
    const profileConfig = PROFILE_CONFIG[user.role];

    if (profileInput && profileConfig) {
        const classPayload = {};
        if (Object.prototype.hasOwnProperty.call(profileInput, "standard")) {
            classPayload.standard = profileInput.standard;
        }
        if (Object.prototype.hasOwnProperty.call(profileInput, "section")) {
            classPayload.section = profileInput.section;
        }
        if (Object.prototype.hasOwnProperty.call(profileInput, "assignedClasses")) {
            classPayload.assignedClasses = profileInput.assignedClasses;
        }

        if (Object.keys(classPayload).length > 0) {
            await normalizeUserClassAssignments(creator.schoolId, user.role, classPayload, {
                excludeUserId: user._id,
            });
        }

        const profileUpdates = {};
        const applyUpdate = (key, value) => {
            if (value !== undefined) profileUpdates[key] = value;
        };

        if (user.role === USER_ROLES.STUDENT) {
            applyUpdate("rollNumber", profileInput.rollNumber);
            applyUpdate("year", profileInput.year);
            applyUpdate("admissionDate", profileInput.admissionDate);
            applyUpdate("fatherName", profileInput.fatherName);
            applyUpdate("fatherContact", profileInput.fatherContact);
            applyUpdate("motherName", profileInput.motherName);
            applyUpdate("motherContact", profileInput.motherContact);
            applyUpdate("address", profileInput.address);

            if (Object.prototype.hasOwnProperty.call(classPayload, "standard")) {
                applyUpdate("standard", classPayload.standard);
            }
            if (Object.prototype.hasOwnProperty.call(classPayload, "section")) {
                applyUpdate("section", classPayload.section);
            }
        }

        if (user.role === USER_ROLES.TEACHER) {
            applyUpdate("employeeId", profileInput.employeeId);
            applyUpdate("qualification", profileInput.qualification);
            applyUpdate("joiningDate", profileInput.joiningDate);
            applyUpdate("expectedSalary", profileInput.expectedSalary);

            if (Object.prototype.hasOwnProperty.call(profileInput, "assignedClasses")) {
                applyUpdate("assignedClasses", classPayload.assignedClasses || []);
            } else if (classPayload.standard && classPayload.section) {
                applyUpdate("assignedClasses", [{
                    standard: classPayload.standard,
                    section: classPayload.section,
                    subjects: [],
                }]);
            }
        }

        if (user.role === USER_ROLES.ADMIN) {
            applyUpdate("department", profileInput.department);
            applyUpdate("employeeId", profileInput.employeeId);
            applyUpdate("permissions", profileInput.permissions);
        }

        if (Object.keys(profileUpdates).length > 0) {
            await profileConfig.model.findOneAndUpdate(
                { userId: user._id, schoolId: creator.schoolId },
                { $set: profileUpdates },
                { new: true, runValidators: true, upsert: true }
            );
        }
    }

    const refreshed = await User.findById(user._id)
        .select("-password -__v")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    return formatUserResponse(refreshed);
};

// UPDATE AVATAR
export const updateAvatar = async (userId, avatarUrl, avatarPublicId) => {
    // 1. FETCH USER
    const user = await User.findById(userId).select("avatarUrl avatarPublicId");

    if (!user) {
        throw new NotFoundError("User not found");
    }

    // 3. STORE OLD AVATAR INFO
    const oldAvatarPublicId = user.avatarPublicId;

    // 4. UPDATE USER
    user.avatarUrl = avatarUrl;
    user.avatarPublicId = avatarPublicId;
    await user.save();

    // 5. CLEANUP OLD AVATAR (NON-BLOCKING)
    if (oldAvatarPublicId && oldAvatarPublicId !== avatarPublicId) {
        deleteFromCloudinary(oldAvatarPublicId)
            .catch(err => logger.warn({
                err,
                publicId: oldAvatarPublicId,
                userId
            }, "Failed to delete old avatar from Cloudinary"));
    }

    // 6. LOG AND RETURN
    logger.info({
        userId,
        newAvatarPublicId: avatarPublicId
    }, "Avatar updated successfully");

    return {
        avatarUrl: user.avatarUrl,
        avatarPublicId: user.avatarPublicId
    };
};

//  Internal Helpers 

const formatUserResponse = (user) => {
    if (!user) return null;

    const profile = user.studentProfile || user.teacherProfile || user.adminProfile || null;

    // Sanitize profile: remove internal fields like 'permissions'
    let sanitizedProfile = null;
    if (profile) {
        const { permissions, ...rest } = profile;
        sanitizedProfile = rest;
    }

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNo: user.contactNo,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        isActive: user.isActive,
        isArchived: user.isArchived,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: sanitizedProfile
    };
};

const getTeacherAssignedClasses = async (teacherId) => {
    const profile = await TeacherProfile.findOne({ userId: teacherId }).select("assignedClasses").lean();
    return profile?.assignedClasses || [];
};
