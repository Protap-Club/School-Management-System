import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import {
  createClassKey,
  getAcademicYear,
  getSchoolClassSections,
  getSeedDaysOfWeek,
  getSubjectsForStandard,
} from "../lib/generatedAcademicSeed.js";

const ttData = loadSeedJson("timetable.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const DAY_MAP = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const daysOfWeek = getSeedDaysOfWeek();

const buildAssignmentMap = (teacherProfiles) => {
  const assignmentMap = new Map();

  teacherProfiles.forEach((profile) => {
    profile.assignedClasses?.forEach((assignedClass) => {
      const classKey = `${assignedClass.standard}-${assignedClass.section}`.toUpperCase();
      assignedClass.subjects?.forEach((subject) => {
        assignmentMap.set(`${classKey}-${subject}`, profile.userId);
      });
    });
  });

  return assignmentMap;
};

const buildClassSubjectEdges = (classSections, assignmentMap) =>
  classSections.flatMap((classSection) => {
    const classKey = createClassKey(classSection).toUpperCase();
    return getSubjectsForStandard(classSection.standard).map((subject) => ({
      edgeKey: `${classKey}-${subject}`,
      classKey,
      standard: String(classSection.standard),
      section: String(classSection.section).toUpperCase(),
      subject,
      teacherId: assignmentMap.get(`${classKey}-${subject}`),
    }));
  });

const sortEdgeOptions = (left, right) => {
  const teacherDiff = String(left.teacherId).localeCompare(String(right.teacherId));
  if (teacherDiff !== 0) return teacherDiff;
  return left.subject.localeCompare(right.subject);
};

const findMatchingForSlot = (remainingEdges, classKeys) => {
  const edgesByClass = remainingEdges.reduce((groups, edge) => {
    if (!groups.has(edge.classKey)) groups.set(edge.classKey, []);
    groups.get(edge.classKey).push(edge);
    return groups;
  }, new Map());

  edgesByClass.forEach((edges) => edges.sort(sortEdgeOptions));

  const matchByTeacher = new Map();

  const tryAssign = (classKey, visitedTeachers) => {
    const options = edgesByClass.get(classKey) || [];

    for (const edge of options) {
      const teacherKey = String(edge.teacherId);
      if (visitedTeachers.has(teacherKey)) continue;
      visitedTeachers.add(teacherKey);

      const existingEdge = matchByTeacher.get(teacherKey);
      if (!existingEdge || tryAssign(existingEdge.classKey, visitedTeachers)) {
        matchByTeacher.set(teacherKey, edge);
        return true;
      }
    }

    return false;
  };

  for (const classKey of classKeys) {
    if (!tryAssign(classKey, new Set())) {
      return null;
    }
  }

  const matching = [...matchByTeacher.values()];
  const matchedClassCount = new Set(matching.map((edge) => edge.classKey)).size;

  if (matching.length !== classKeys.length || matchedClassCount !== classKeys.length) {
    return null;
  }

  return matching;
};

const buildSlotPlan = (classSections, assignmentMap, slotCount, schoolCode) => {
  const classKeys = classSections.map((classSection) => createClassKey(classSection).toUpperCase());
  const edges = buildClassSubjectEdges(classSections, assignmentMap).map((edge, index) => ({
    ...edge,
    edgeId: index,
  }));

  const missingTeacherEdges = edges.filter((edge) => !edge.teacherId);
  if (missingTeacherEdges.length) {
    const sample = missingTeacherEdges
      .slice(0, 5)
      .map((edge) => edge.edgeKey)
      .join(", ");
    throw new Error(`[${schoolCode}] Missing teacher assignments for: ${sample}`);
  }

  if (edges.length !== classKeys.length * slotCount) {
    throw new Error(
      `[${schoolCode}] Cannot build a full daily timetable: ${edges.length} class-subject slots for ${classKeys.length} classes and ${slotCount} periods`
    );
  }

  const plan = [];
  let remainingEdges = [...edges];

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const matching = findMatchingForSlot(remainingEdges, classKeys);
    if (!matching) {
      throw new Error(`[${schoolCode}] Unable to create a conflict-free timetable for period ${slotIndex + 1}`);
    }

    const usedEdgeIds = new Set(matching.map((edge) => edge.edgeId));
    matching.forEach((edge) => plan.push({ ...edge, slotIndex }));
    remainingEdges = remainingEdges.filter((edge) => !usedEdgeIds.has(edge.edgeId));
  }

  if (remainingEdges.length) {
    throw new Error(`[${schoolCode}] Timetable plan left ${remainingEdges.length} unscheduled periods`);
  }

  return plan;
};

const seedTimetable = async () => {
  logger.info("=== Seeding Timetable ===");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });

    if (!school) {
      logger.warn(`School ${code} not found. Skipping timetable.`);
      continue;
    }

    const existing = await Timetable.find({ schoolId: school._id }).select("_id");
    await TimetableEntry.deleteMany({ timetableId: { $in: existing.map((t) => t._id) } });
    await Timetable.deleteMany({ schoolId: school._id });
    await TimeSlot.deleteMany({ schoolId: school._id });

    const slots = await TimeSlot.insertMany(
      ttData.timeSlots.map((slot) => ({
        ...slot,
        schoolId: school._id,
      }))
    );

    const slotByNumber = {};
    slots.forEach((slot) => {
      slotByNumber[slot.slotNumber] = slot;
    });

    const classSections = getSchoolClassSections(code);
    const timetableHeaders = classSections.map((classSection) => ({
      schoolId: school._id,
      standard: String(classSection.standard),
      section: String(classSection.section).toUpperCase(),
      academicYear: ttData.academicYear || getAcademicYear(),
    }));

    const createdTimetables = await Timetable.insertMany(timetableHeaders);

    const timetableMap = {};
    createdTimetables.forEach((item) => {
      timetableMap[`${item.standard}-${item.section}`.toUpperCase()] = item._id;
    });

    const TeacherProfile = (await import("../../module/user/model/TeacherProfile.model.js")).default;
    const teacherProfiles = await TeacherProfile.find({ schoolId: school._id }).lean();
    const assignmentMap = buildAssignmentMap(teacherProfiles);

    const classSlots = Object.values(slotByNumber)
      .filter((slot) => slot.slotType === "CLASS")
      .sort((a, b) => a.slotNumber - b.slotNumber);
    const slotPlan = buildSlotPlan(classSections, assignmentMap, classSlots.length, code);

    const entries = [];
    daysOfWeek.forEach((day, dayIndex) => {
      const dayShort = DAY_MAP[day];
      if (!dayShort) return;

      slotPlan.forEach((plannedPeriod) => {
        const slot = classSlots[(plannedPeriod.slotIndex + dayIndex) % classSlots.length];
        const timetableId = timetableMap[plannedPeriod.classKey];
        if (!slot || !timetableId) return;

        entries.push({
          schoolId: school._id,
          timetableId,
          dayOfWeek: dayShort,
          timeSlotId: slot._id,
          subject: plannedPeriod.subject,
          teacherId: plannedPeriod.teacherId,
          roomNumber: `Class ${plannedPeriod.standard}-${plannedPeriod.section}`,
        });
      });
    });

    if (entries.length) {
      await TimetableEntry.insertMany(entries, { ordered: false });
    }

    logger.info(
      `[${code}] Timetable seeded: ${slots.length} slots, ${createdTimetables.length} timetables, ${entries.length} entries`
    );
  }
};

export const timetableSeedInternals = {
  buildAssignmentMap,
  buildSlotPlan,
};

export default seedTimetable;
