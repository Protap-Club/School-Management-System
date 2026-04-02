import mongoose from "mongoose";
import Result from "./result.model.js";
import Exam from "../examination/Exam.model.js";
import { Notice } from "../notice/Notice.model.js";
import User from "../user/model/User.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
} from "../../utils/customError.js";
import logger from "../../config/logger.js";

const RESULT_STATUS = Object.freeze({
    DRAFT: "draft",
    PUBLISHED: "published",
    LOCKED: "locked",
});

const PASS_STATUS = Object.freeze({
    PASS: "pass",
    FAIL: "fail",
});

const roundToTwo = (value) => Number(Number(value || 0).toFixed(2));

const normalizeSubjectKey = (subject) => String(subject || "").trim().toLowerCase();

const sortByRollNumber = (a, b) =>
    String(a.rollNumber || "").localeCompare(String(b.rollNumber || ""), undefined, {
        numeric: true,
        sensitivity: "base",
    });

const computeCanEdit = (result) => {
    if (!result) return true;
    if (result.status === RESULT_STATUS.DRAFT) return true;
    if (result.status === RESULT_STATUS.PUBLISHED && result.editableUntil) {
        return new Date(result.editableUntil) >= new Date();
    }
    return false;
};

const buildExamSummary = (exam) => ({
    _id: exam._id,
    name: exam.name,
    examType: exam.examType,
    category: exam.category,
    academicYear: exam.academicYear,
    standard: exam.standard,
    section: exam.section,
    status: exam.status,
    subjects: (exam.schedule || []).map((item) => ({
        subject: item.subject,
        maxMarks: item.totalMarks,
        passingMarks: item.passingMarks || 0,
        examDate: item.examDate,
        startTime: item.startTime,
        endTime: item.endTime,
    })),
});

const buildResultPayload = (result, exam, studentUser, studentProfile) => {
    const now = new Date();
    const subjects = (result.subjects || []).map((item) => ({
        subject: item.subject,
        maxMarks: item.maxMarks,
        obtainedMarks: item.obtainedMarks,
        percentage: item.maxMarks > 0 ? roundToTwo((item.obtainedMarks / item.maxMarks) * 100) : 0,
    }));

    const student = {
        _id: studentUser?._id || result.studentId,
        name: studentUser?.name || "Student",
        email: studentUser?.email || "",
        rollNumber: studentProfile?.rollNumber || null,
        standard: studentProfile?.standard || exam.standard,
        section: studentProfile?.section || exam.section,
    };

    return {
        _id: result._id,
        exam: buildExamSummary(exam),
        student,
        subjects,
        summary: {
            totalMarks: result.totalMarks,
            obtainedMarks: result.obtainedMarks,
            percentage: result.percentage,
            grade: result.grade,
            resultStatus: result.resultStatus,
            promoted: result.promoted,
            status: result.status,
            publishedAt: result.publishedAt,
            editableUntil: result.editableUntil,
            canEdit:
                result.status === RESULT_STATUS.DRAFT ||
                (result.status === RESULT_STATUS.PUBLISHED &&
                    result.editableUntil &&
                    new Date(result.editableUntil) >= now),
        },
        resultSheet: {
            examName: exam.name,
            academicYear: exam.academicYear,
            className: `${exam.standard}-${exam.section}`,
            studentName: student.name,
            rollNumber: student.rollNumber,
            subjects,
            totalMarks: result.totalMarks,
            obtainedMarks: result.obtainedMarks,
            percentage: result.percentage,
            grade: result.grade,
            resultStatus: result.resultStatus,
            promoted: result.promoted,
        },
        audit: {
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            createdBy: result.createdBy,
            updatedBy: result.updatedBy,
        },
    };
};

const getCountsFromResults = (results, totalStudents = 0) => {
    const counts = results.reduce(
        (acc, item) => {
            acc.enteredResults += 1;
            if (item.status === RESULT_STATUS.DRAFT) acc.draft += 1;
            if (item.status === RESULT_STATUS.PUBLISHED) acc.published += 1;
            if (item.status === RESULT_STATUS.LOCKED) acc.locked += 1;
            return acc;
        },
        {
            totalStudents,
            enteredResults: 0,
            pendingResults: 0,
            draft: 0,
            published: 0,
            locked: 0,
        }
    );

    counts.pendingResults = Math.max(totalStudents - counts.enteredResults, 0);
    return counts;
};

const lockExpiredResults = async (filter = {}) => {
    const now = new Date();
    await Result.updateMany(
        {
            ...filter,
            status: RESULT_STATUS.PUBLISHED,
            editableUntil: { $ne: null, $lt: now },
        },
        {
            $set: {
                status: RESULT_STATUS.LOCKED,
            },
        }
    );
};

const getExamOrThrow = async (schoolId, examId) => {
    const exam = await Exam.findOne({
        _id: examId,
        schoolId,
        isActive: true,
    }).lean();

    if (!exam) {
        throw new NotFoundError("Exam not found");
    }

    return exam;
};

const assertCompletedExam = (exam) => {
    if (exam.status !== "COMPLETED") {
        throw new BadRequestError("Results can only be managed for completed exams");
    }
};

const assertStaffAccess = async () => true;

const createResultPublishedNotice = async (schoolId, exam, userId) => {
    const classLabel = `${exam.standard} ${exam.section}`;

    return Notice.create({
        schoolId,
        createdBy: userId,
        title: `Results declared for Class ${classLabel}`,
        message: `Results declared for ${classLabel} students. Please check your result. If you find any change or problem, report it to your class teacher within 2 days.`,
        recipientType: "classes",
        recipients: [`${exam.standard}-${exam.section}`],
        type: "notice",
        status: "sent",
        requiresAcknowledgment: false,
    });
};

const getClassRoster = async (schoolId, exam) => {
    const profiles = await StudentProfile.find({
        schoolId,
        standard: exam.standard,
        section: exam.section,
    })
        .select("userId rollNumber standard section")
        .lean();

    if (!profiles.length) {
        return [];
    }

    const userIds = profiles.map((profile) => profile.userId);
    const users = await User.find({
        _id: { $in: userIds },
        schoolId,
        role: USER_ROLES.STUDENT,
        isArchived: false,
    })
        .select("name email isActive")
        .lean();

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    return profiles
        .map((profile) => {
            const user = userMap.get(String(profile.userId));
            if (!user) return null;

            return {
                studentId: profile.userId,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                rollNumber: profile.rollNumber,
                standard: profile.standard,
                section: profile.section,
            };
        })
        .filter(Boolean)
        .sort(sortByRollNumber);
};

const getStudentForExam = async (schoolId, exam, studentId) => {
    const [studentProfile, studentUser] = await Promise.all([
        StudentProfile.findOne({
            schoolId,
            userId: studentId,
            standard: exam.standard,
            section: exam.section,
        })
            .select("userId rollNumber standard section")
            .lean(),
        User.findOne({
            _id: studentId,
            schoolId,
            role: USER_ROLES.STUDENT,
            isArchived: false,
        })
            .select("name email")
            .lean(),
    ]);

    if (!studentProfile || !studentUser) {
        throw new NotFoundError("Student not found in this exam class");
    }

    return { studentProfile, studentUser };
};

const normalizeSubjects = (exam, subjects = []) => {
    if (!Array.isArray(exam.schedule) || exam.schedule.length === 0) {
        throw new BadRequestError("This exam has no subjects configured");
    }

    const examSubjectMap = new Map();
    for (const item of exam.schedule) {
        const subjectKey = normalizeSubjectKey(item.subject);
        if (examSubjectMap.has(subjectKey)) {
            throw new BadRequestError(
                `Exam contains duplicate subject names: ${item.subject}`
            );
        }
        examSubjectMap.set(subjectKey, item);
    }

    if (subjects.length !== exam.schedule.length) {
        throw new BadRequestError("All exam subjects must be provided exactly once");
    }

    const providedMap = new Map();
    for (const item of subjects) {
        const subjectKey = normalizeSubjectKey(item.subject);
        if (!examSubjectMap.has(subjectKey)) {
            throw new BadRequestError(`Subject "${item.subject}" does not belong to this exam`);
        }
        if (providedMap.has(subjectKey)) {
            throw new BadRequestError(`Duplicate result entry found for "${item.subject}"`);
        }
        providedMap.set(subjectKey, item);
    }

    return exam.schedule.map((examSubject) => {
        const subjectKey = normalizeSubjectKey(examSubject.subject);
        const subjectMarks = providedMap.get(subjectKey);
        const maxMarks = Number(examSubject.totalMarks || 0);
        const obtainedMarks = Number(subjectMarks?.obtainedMarks || 0);

        if (obtainedMarks > maxMarks) {
            throw new BadRequestError(
                `Obtained marks cannot exceed maximum marks for "${examSubject.subject}"`
            );
        }

        return {
            subject: examSubject.subject,
            maxMarks,
            obtainedMarks,
        };
    });
};

const calculateGrade = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 75) return "A";
    if (percentage >= 60) return "B";
    if (percentage >= 40) return "C";
    return "F";
};

const calculateResultSummary = (exam, subjects) => {
    const totalMarks = subjects.reduce((sum, item) => sum + item.maxMarks, 0);
    const obtainedMarks = subjects.reduce((sum, item) => sum + item.obtainedMarks, 0);
    const percentage = totalMarks > 0 ? roundToTwo((obtainedMarks / totalMarks) * 100) : 0;
    const grade = calculateGrade(percentage);

    const failed = subjects.some((item) => {
        const examSubject = exam.schedule.find(
            (scheduleItem) =>
                normalizeSubjectKey(scheduleItem.subject) === normalizeSubjectKey(item.subject)
        );
        const passingMarks =
            Number(examSubject?.passingMarks || 0) > 0
                ? Number(examSubject.passingMarks)
                : Number(item.maxMarks) * 0.33;

        return item.obtainedMarks < passingMarks;
    });

    const resultStatus = failed ? PASS_STATUS.FAIL : PASS_STATUS.PASS;

    return {
        subjects,
        totalMarks,
        obtainedMarks,
        percentage,
        grade,
        resultStatus,
        promoted: resultStatus === PASS_STATUS.PASS,
    };
};

const buildRosterCountMap = async (schoolId, exams) => {
    if (!exams.length) return new Map();

    const classFilters = [];
    const seen = new Set();

    for (const exam of exams) {
        const key = `${exam.standard}::${exam.section}`;
        if (!seen.has(key)) {
            seen.add(key);
            classFilters.push({ standard: exam.standard, section: exam.section });
        }
    }

    const rows = await StudentProfile.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                $or: classFilters,
            },
        },
        {
            $group: {
                _id: {
                    standard: "$standard",
                    section: "$section",
                },
                totalStudents: { $sum: 1 },
            },
        },
    ]);

    return new Map(
        rows.map((row) => [`${row._id.standard}::${row._id.section}`, row.totalStudents])
    );
};

const buildExamResultCountMap = async (schoolId, examIds) => {
    if (!examIds.length) return new Map();

    const rows = await Result.aggregate([
        {
            $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                examId: { $in: examIds },
            },
        },
        {
            $group: {
                _id: "$examId",
                enteredResults: { $sum: 1 },
                draft: {
                    $sum: {
                        $cond: [{ $eq: ["$status", RESULT_STATUS.DRAFT] }, 1, 0],
                    },
                },
                published: {
                    $sum: {
                        $cond: [{ $eq: ["$status", RESULT_STATUS.PUBLISHED] }, 1, 0],
                    },
                },
                locked: {
                    $sum: {
                        $cond: [{ $eq: ["$status", RESULT_STATUS.LOCKED] }, 1, 0],
                    },
                },
            },
        },
    ]);

    return new Map(rows.map((row) => [String(row._id), row]));
};

export const getCompletedExams = async (schoolId, user, platform, pageNum = 0, limit = 25) => {

    const query = {
        schoolId,
        status: "COMPLETED",
        isActive: true,
    };

    const page = Math.max(0, Number(pageNum) || 0);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));

    const totalCount = await Exam.countDocuments(query);

    const examsData = await Exam.find(query)
        .select("name examType category academicYear standard section status schedule createdAt")
        .sort({ createdAt: -1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .lean();

    const rosterCountMap = await buildRosterCountMap(schoolId, examsData);
    const resultCountMap = await buildExamResultCountMap(
        schoolId,
        examsData.map((exam) => exam._id)
    );

    const exams = examsData.map((exam) => {
        const classKey = `${exam.standard}::${exam.section}`;
        const totalStudents = rosterCountMap.get(classKey) || 0;
        const resultCounts = resultCountMap.get(String(exam._id)) || {};
        const payload = {
            _id: exam._id,
            name: exam.name,
            examType: exam.examType,
            category: exam.category,
            academicYear: exam.academicYear,
            standard: exam.standard,
            section: exam.section,
            status: exam.status,
            subjectsCount: Array.isArray(exam.schedule) ? exam.schedule.length : 0,
            counts: {
                totalStudents,
                enteredResults: resultCounts.enteredResults || 0,
                pendingResults: Math.max(
                    totalStudents - (resultCounts.enteredResults || 0),
                    0
                ),
                draft: resultCounts.draft || 0,
                published: resultCounts.published || 0,
                locked: resultCounts.locked || 0,
            },
            createdAt: exam.createdAt,
        };

        if (platform === "mobile") {
            return payload;
        }

        return {
            ...payload,
            subjects: (exam.schedule || []).map((item) => ({
                subject: item.subject,
                maxMarks: item.totalMarks,
                passingMarks: item.passingMarks || 0,
            })),
        };
    });

    return {
        exams,
        pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
        },
    };
};

export const getExamStudents = async (schoolId, examId, user, platform) => {

    const exam = await getExamOrThrow(schoolId, examId);
    assertCompletedExam(exam);
    await assertStaffAccess(schoolId, exam, user);

    const [roster, results] = await Promise.all([
        getClassRoster(schoolId, exam),
        Result.find({ schoolId, examId })
            .select(
                "_id studentId totalMarks obtainedMarks percentage grade resultStatus promoted status publishedAt editableUntil createdAt updatedAt"
            )
            .lean(),
    ]);

    const resultMap = new Map(results.map((item) => [String(item.studentId), item]));
    const counts = getCountsFromResults(results, roster.length);

    return {
        exam: buildExamSummary(exam),
        counts,
        students: roster.map((student) => {
            const result = resultMap.get(String(student.studentId));
            const payload = {
                studentId: student.studentId,
                name: student.name,
                rollNumber: student.rollNumber,
                isActive: student.isActive,
                result: result
                    ? {
                          _id: result._id,
                          status: result.status,
                          totalMarks: result.totalMarks,
                          obtainedMarks: result.obtainedMarks,
                          percentage: result.percentage,
                          grade: result.grade,
                          resultStatus: result.resultStatus,
                          promoted: result.promoted,
                          publishedAt: result.publishedAt,
                          editableUntil: result.editableUntil,
                          canEdit: computeCanEdit(result),
                      }
                    : null,
            };

            if (platform !== "mobile") {
                payload.email = student.email;
            }

            return payload;
        }),
    };
};

export const saveResult = async (schoolId, data, user) => {
    const exam = await getExamOrThrow(schoolId, data.examId);
    assertCompletedExam(exam);
    await assertStaffAccess(schoolId, exam, user);

    const { studentProfile, studentUser } = await getStudentForExam(
        schoolId,
        exam,
        data.studentId
    );

    const subjects = normalizeSubjects(exam, data.subjects);
    const summary = calculateResultSummary(exam, subjects);

    let result = await Result.findOne({
        schoolId,
        examId: data.examId,
        studentId: data.studentId,
    });

    if (result) {
        if (result.status === RESULT_STATUS.LOCKED) {
            throw new BadRequestError("This result is locked and cannot be edited");
        }
        if (result.status === RESULT_STATUS.PUBLISHED && !computeCanEdit(result)) {
            throw new BadRequestError("This published result can no longer be edited");
        }

        result.subjects = summary.subjects;
        result.totalMarks = summary.totalMarks;
        result.obtainedMarks = summary.obtainedMarks;
        result.percentage = summary.percentage;
        result.grade = summary.grade;
        result.resultStatus = summary.resultStatus;
        result.promoted = summary.promoted;
        result.updatedBy = user._id;

        await result.save();
        logger.info(`Result updated: exam=${data.examId} student=${data.studentId}`);
    } else {
        try {
            result = await Result.create({
                examId: data.examId,
                studentId: data.studentId,
                schoolId,
                subjects: summary.subjects,
                totalMarks: summary.totalMarks,
                obtainedMarks: summary.obtainedMarks,
                percentage: summary.percentage,
                grade: summary.grade,
                resultStatus: summary.resultStatus,
                promoted: summary.promoted,
                createdBy: user._id,
                updatedBy: user._id,
            });
            logger.info(`Result created: exam=${data.examId} student=${data.studentId}`);
        } catch (error) {
            if (error?.code === 11000) {
                throw new ConflictError("Result already exists for this student and exam");
            }
            throw error;
        }
    }

    const savedResult = await Result.findById(result._id).lean();
    return buildResultPayload(savedResult, exam, studentUser, studentProfile);
};

export const getExamResults = async (schoolId, examId, user, platform) => {

    const exam = await getExamOrThrow(schoolId, examId);
    assertCompletedExam(exam);
    await assertStaffAccess(schoolId, exam, user);

    const [roster, results] = await Promise.all([
        getClassRoster(schoolId, exam),
        Result.find({ schoolId, examId }).sort({ createdAt: -1 }).lean(),
    ]);

    const rosterMap = new Map(roster.map((student) => [String(student.studentId), student]));
    const counts = getCountsFromResults(results, roster.length);

    const resultList = results.map((result) => {
        const student = rosterMap.get(String(result.studentId)) || {
            studentId: result.studentId,
            name: "Student",
            email: "",
            rollNumber: null,
            standard: exam.standard,
            section: exam.section,
        };

        return buildResultPayload(
            result,
            exam,
            { _id: student.studentId, name: student.name, email: student.email },
            {
                userId: student.studentId,
                rollNumber: student.rollNumber,
                standard: student.standard || exam.standard,
                section: student.section || exam.section,
            }
        );
    });

    return {
        exam: buildExamSummary(exam),
        counts,
        results:
            platform === "mobile"
                ? resultList.map((item) => ({
                      _id: item._id,
                      student: item.student,
                      summary: item.summary,
                      subjects: item.subjects,
                  }))
                : resultList,
    };
};

export const publishExamResults = async (schoolId, examId, user) => {

    const exam = await getExamOrThrow(schoolId, examId);
    assertCompletedExam(exam);
    await assertStaffAccess(schoolId, exam, user);

    const [roster, existingResults] = await Promise.all([
        getClassRoster(schoolId, exam),
        Result.find({ schoolId, examId }).select("status").lean(),
    ]);

    if (!existingResults.length) {
        throw new BadRequestError("No results are available to publish for this exam");
    }

    const counts = getCountsFromResults(existingResults, roster.length);
    if (counts.draft === 0) {
        throw new BadRequestError("All saved results are already published for this exam");
    }

    const publishedAt = new Date();
    const editableUntil = new Date(publishedAt);
    editableUntil.setDate(editableUntil.getDate() + 7);

    const updateResult = await Result.updateMany(
        {
            schoolId,
            examId,
            status: RESULT_STATUS.DRAFT,
        },
        {
            $set: {
                status: RESULT_STATUS.PUBLISHED,
                publishedAt,
                editableUntil,
                updatedBy: user._id,
            },
        }
    );

    logger.info(`Results published: exam=${examId} updated=${updateResult.modifiedCount}`);

    let noticeGenerated = false;
    try {
        await createResultPublishedNotice(schoolId, exam, user._id);
        noticeGenerated = true;
    } catch (error) {
        logger.warn(
            `Result publish notice could not be created for exam=${examId}: ${error.message}`
        );
    }

    const refreshedResults = await Result.find({ schoolId, examId }).select("status").lean();
    return {
        exam: buildExamSummary(exam),
        counts: getCountsFromResults(refreshedResults, roster.length),
        publishedAt,
        editableUntil,
        publishedCount: updateResult.modifiedCount,
        noticeGenerated,
    };
};

export const getMyResults = async (schoolId, studentId, filters = {}, platform) => {

    const [studentUser, studentProfile] = await Promise.all([
        User.findOne({
            _id: studentId,
            schoolId,
            role: USER_ROLES.STUDENT,
            isArchived: false,
        })
            .select("name email")
            .lean(),
        StudentProfile.findOne({ userId: studentId, schoolId })
            .select("rollNumber standard section")
            .lean(),
    ]);

    if (!studentUser || !studentProfile) {
        throw new NotFoundError("Student profile not found");
    }

    const query = {
        schoolId,
        studentId,
        status: {
            $in: [RESULT_STATUS.PUBLISHED, RESULT_STATUS.LOCKED],
        },
    };

    if (filters.examId) {
        query.examId = filters.examId;
    }

    const results = await Result.find(query)
        .sort({ publishedAt: -1, updatedAt: -1 })
        .lean();

    if (filters.examId && results.length === 0) {
        throw new NotFoundError("Result not found");
    }

    const examIds = [...new Set(results.map((item) => String(item.examId)))];
    const exams = await Exam.find({
        _id: { $in: examIds },
        schoolId,
        isActive: true,
    }).lean();

    const examMap = new Map(exams.map((exam) => [String(exam._id), exam]));
    const formatted = results
        .map((result) => {
            const exam = examMap.get(String(result.examId));
            if (!exam) return null;
            return buildResultPayload(result, exam, studentUser, studentProfile);
        })
        .filter(Boolean);

    if (filters.examId) {
        return { result: formatted[0] };
    }

    if (platform === "mobile") {
        return {
            results: formatted.map((item) => ({
                _id: item._id,
                exam: item.exam,
                summary: item.summary,
            })),
        };
    }

    return { results: formatted };
};

export const startResultExpiryJob = () => {
    const runJob = () => {
        lockExpiredResults({}).catch((err) => logger.error(err, "Failed to lock expired results"));
    };

    runJob(); // Run immediately on startup
    setInterval(runJob, 15 * 60 * 1000); // Reset every 15 minutes
};
