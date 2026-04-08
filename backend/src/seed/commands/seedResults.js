import School from "../../module/school/School.model.js";
import Exam from "../../module/examination/Exam.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import Result from "../../module/result/result.model.js";
import User from "../../module/user/model/User.model.js";
import logger from "../../config/logger.js";

const hashInt = (input) => {
  let h = 2166136261;
  const str = input.toString();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
};

const getBaseIntelligence = (userId) => {
    // Determine student "base intelligence" from their ID, returning a value 0 to 1
    return (hashInt(userId.toString()) % 1000) / 1000;
};

// Gaussian-ish random based on seed
function getMarksWithBellCurve(baseIntelligence, maxMarks, subjectIndex) {
    // Subject specific variation - some are slightly better at math, some at english
    const subjectVariation = ((hashInt(subjectIndex.toString()) % 100) - 50) / 1000; // -0.05 to +0.05
    
    // Students typically cluster around 60-85%
    // High intelligence pulls this towards 85%+
    let targetPercentage = 0.50 + (baseIntelligence * 0.45) + subjectVariation;
    
    // Ensure valid ranges (e.g., extremely rare for anyone to get exactly 100%, cap at ~98%)
    // But allow at least 25% base score so nobody has a 0 unless explicitly failed
    targetPercentage = Math.max(0.25, Math.min(0.98, targetPercentage));
    
    return Math.round(maxMarks * targetPercentage);
}

const seedResults = async () => {
  logger.info("=== Seeding Results ===");

  const schools = await School.find();

  for (const school of schools) {
    // Only generate results for exams that are COMPLETED (meaning they are in the past)
    const completedExams = await Exam.find({ schoolId: school._id, status: "COMPLETED" });
    
    if (completedExams.length === 0) {
        continue;
    }

    const admin = await User.findOne({
      schoolId: school._id,
      role: { $in: ["admin", "super_admin"] },
    }).select("_id");

    const records = [];
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (const exam of completedExams) {
      // Find students in this class
      const students = await StudentProfile.find({
          schoolId: school._id,
          standard: exam.standard,
          section: exam.section
      });

      for (const student of students) {
         const baseIntelligence = getBaseIntelligence(student.userId);
         
         const resultsBySubject = [];
         let obtainedTotal = 0;
         let maxTotal = 0;

         exam.schedule.forEach((scheduleItem, idx) => {
             const subjectMax = scheduleItem.totalMarks;
             const obtained = getMarksWithBellCurve(baseIntelligence, subjectMax, idx);
             
             resultsBySubject.push({
                 subject: scheduleItem.subject,
                 maxMarks: subjectMax,
                 obtainedMarks: obtained
             });

             obtainedTotal += obtained;
             maxTotal += subjectMax;
         });

         const percentage = (maxTotal > 0) ? (obtainedTotal / maxTotal) * 100 : 0;
         
         // simple grade calc
         let grade = "F";
         if (percentage >= 90) grade = "A+";
         else if (percentage >= 80) grade = "A";
         else if (percentage >= 70) grade = "B+";
         else if (percentage >= 60) grade = "B";
         else if (percentage >= 50) grade = "C";
         else if (percentage >= 40) grade = "D";
         else if (percentage >= 33) grade = "E";

         const resultStatus = percentage >= 33 ? "pass" : "fail";

         records.push({
             examId: exam._id,
             studentId: student.userId,
             schoolId: school._id,
             subjects: resultsBySubject,
             totalMarks: maxTotal,
             obtainedMarks: obtainedTotal,
             percentage: parseFloat(percentage.toFixed(2)),
             grade,
             resultStatus,
             status: "published",
             publishedAt: new Date(),
             createdBy: admin ? admin._id : null
         });

         if (records.length >= BATCH_SIZE) {
            await Result.insertMany(records, { ordered: false });
            totalInserted += records.length;
            records.length = 0;
         }
      }
    }

    if (records.length > 0) {
        await Result.insertMany(records, { ordered: false });
        totalInserted += records.length;
    }

    logger.info(`[${school.code}] Results seeded: ${totalInserted}`);
  }
};

export default seedResults;
