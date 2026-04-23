import { loadSeedJson } from "./loadJson.js";

const usersData = loadSeedJson("users.json");
const schoolData = loadSeedJson("schools.json");
const academicSeed = loadSeedJson("academicSeed.json");
const profilesData = loadSeedJson("profiles.json");

const schoolMap = new Map((schoolData.schools || []).map((school) => [school.code, school]));
const teacherPool = academicSeed.teacherNamePool || [];
const teacherContactStarts = academicSeed.teacherContactStarts || {};
const qualifications = academicSeed.qualifications || ["B.Ed."];
const subjectBands = academicSeed.subjectBands || {};

const slugify = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

const toClassKey = ({ standard, section }) => `${String(standard)}-${String(section).toUpperCase()}`;

export const sortClassSections = (classSections = []) =>
  [...classSections].sort((left, right) => {
    const standardDiff = Number(left.standard) - Number(right.standard);
    if (standardDiff !== 0) return standardDiff;
    return String(left.section).localeCompare(String(right.section));
  });

export const getSchoolClassSections = (code) => {
  const school = schoolMap.get(code);
  return sortClassSections(school?.academic?.classSections || []);
};

export const getSubjectBandKey = (standard) => {
  const value = Number(standard);
  if (value <= 5) return "primary";
  if (value <= 8) return "middle";
  if (value <= 10) return "secondary";
  return "senior";
};

export const getSubjectsForStandard = (standard) => {
  const bandKey = getSubjectBandKey(standard);
  return [...(subjectBands[bandKey] || subjectBands.secondary || ["English", "Mathematics"])];
};

const buildTeacherContact = (code, index) => {
  const startingNumber = Number(teacherContactStarts[code] || "9000000000");
  return `+91-${String(startingNumber + index)}`;
};

const buildDefaultTeacherName = (index, usedNames) => {
  const selectedName = teacherPool.find((name) => !usedNames.has(name.toLowerCase()));
  if (selectedName) {
    usedNames.add(selectedName.toLowerCase());
    return selectedName;
  }

  const fallbackName = `Teacher ${String(index).padStart(2, "0")}`;
  usedNames.add(fallbackName.toLowerCase());
  return fallbackName;
};

const qualificationFor = (profile, index) =>
  profile?.qualification || qualifications[index % qualifications.length];

const joiningDateFor = (profile, index) => {
  if (profile?.joiningDate) return profile.joiningDate;
  const month = (index % 12) + 1;
  const day = (index % 27) + 1;
  return `2021-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const salaryFor = (profile, index) => {
  if (profile?.expectedSalary) return profile.expectedSalary;
  return 36000 + (index % 12) * 1200;
};

const getOrCreateAssignedClass = (teacher, cls) => {
  const standard = String(cls.standard);
  const section = String(cls.section).toUpperCase();
  let assignedClass = teacher.assignedClasses.find(
    (item) => item.standard === standard && item.section === section
  );

  if (!assignedClass) {
    assignedClass = { standard, section, subjects: [] };
    teacher.assignedClasses.push(assignedClass);
  }

  return assignedClass;
};

const addTeachingAssignment = (teacher, cls, subject) => {
  const assignedClass = getOrCreateAssignedClass(teacher, cls);
  if (!assignedClass.subjects.includes(subject)) {
    assignedClass.subjects.push(subject);
  }
  if (!teacher.subjects.includes(subject)) {
    teacher.subjects.push(subject);
  }
};

const buildTeacherRecords = (code, classSections, seedTeachers = usersData[code]?.teachers || []) => {
  const schoolProfiles = profilesData[code]?.teacherProfiles || [];
  const schoolDomain = usersData.studentConfig?.emailDomains?.[code] || `${code.toLowerCase()}.com`;
  const usedNames = new Set(seedTeachers.map((teacher) => String(teacher.name).toLowerCase()));

  return classSections.map((classSection, index) => {
    const existingTeacher = seedTeachers[index];
    const name = existingTeacher?.name || buildDefaultTeacherName(index + 1, usedNames);
    const email = existingTeacher?.email || `${slugify(name)}.${index + 1}@${schoolDomain}`;
    const profile = schoolProfiles.find((item) => item.email === email);
    const teacherMeta = { ...existingTeacher, ...profile };

    return {
      name,
      email,
      role: "teacher",
      contactNo: existingTeacher?.contactNo || buildTeacherContact(code, index + 1),
      employeeId: teacherMeta.employeeId || `${code}-TCH-${String(index + 1).padStart(3, "0")}`,
      qualification: qualificationFor(teacherMeta, index),
      joiningDate: joiningDateFor(teacherMeta, index),
      expectedSalary: salaryFor(teacherMeta, index),
      classTeacherOf: {
        standard: String(classSection.standard),
        section: String(classSection.section).toUpperCase(),
      },
      specialization: "",
      subjects: [],
      assignedClasses: [],
    };
  });
};

const applyTeachingAssignments = (teachers, classSections) => {
  const teacherByClassKey = new Map(
    teachers.map((teacher) => [toClassKey(teacher.classTeacherOf), teacher])
  );
  const sortedStandards = [
    ...new Set(classSections.map((classSection) => Number(classSection.standard))),
  ].sort((left, right) => left - right);
  const sectionOrder = [
    ...new Set(classSections.map((classSection) => String(classSection.section).toUpperCase())),
  ].sort((left, right) => left.localeCompare(right));
  const standardSet = new Set(sortedStandards);

  const nearestConfiguredStandard = (standard, offset) => {
    const requested = Number(standard) + offset;
    if (standardSet.has(requested)) return requested;

    return sortedStandards.reduce((nearest, candidate) => {
      const candidateDistance = Math.abs(candidate - requested);
      const nearestDistance = Math.abs(nearest - requested);
      if (candidateDistance !== nearestDistance) {
        return candidateDistance < nearestDistance ? candidate : nearest;
      }
      return Math.abs(candidate - Number(standard)) < Math.abs(nearest - Number(standard))
        ? candidate
        : nearest;
    }, sortedStandards[0]);
  };

  const adjacentOffsetsBySubjectIndex = [-1, 0, 1, -1, 1, 0, 0];

  sortClassSections(classSections).forEach((classSection) => {
    const standard = String(classSection.standard);
    const section = String(classSection.section).toUpperCase();
    const sectionIndex = Math.max(0, sectionOrder.indexOf(section));
    const subjects = getSubjectsForStandard(standard);

    subjects.forEach((subject, subjectIndex) => {
      const offset = adjacentOffsetsBySubjectIndex[subjectIndex % adjacentOffsetsBySubjectIndex.length];
      const teacherStandard = nearestConfiguredStandard(standard, offset);
      const teacherSection = sectionOrder[(sectionIndex + subjectIndex) % sectionOrder.length];
      const teacher =
        teacherByClassKey.get(`${teacherStandard}-${teacherSection}`) ||
        teacherByClassKey.get(`${standard}-${section}`);

      addTeachingAssignment(teacher, { standard, section }, subject);
    });
  });

  teachers.forEach((teacher) => {
    teacher.assignedClasses.sort((left, right) => {
      const standardDiff = Number(left.standard) - Number(right.standard);
      if (standardDiff !== 0) return standardDiff;
      return left.section.localeCompare(right.section);
    });
    teacher.assignedClasses.forEach((assignedClass) => {
      assignedClass.subjects.sort((left, right) => left.localeCompare(right));
    });
    teacher.subjects.sort((left, right) => left.localeCompare(right));
    teacher.specialization = teacher.subjects[0] || "General";
  });
};

export const buildTeacherSeedData = (code) => {
  const schoolDef = schoolMap.get(code);
  const classSections = getSchoolClassSections(code);

  if (schoolDef?.handCrafted) {
    const demo = loadSeedJson("demoProfiles.json");
    if (demo?.[code]?.teachers) {
      const teachers = buildTeacherRecords(code, classSections, demo[code].teachers);
      applyTeachingAssignments(teachers, classSections);
      return teachers;
    }
  }

  const teachers = buildTeacherRecords(code, classSections);
  applyTeachingAssignments(teachers, classSections);
  return teachers;
};

export const getAcademicYear = () => usersData.studentConfig?.year || new Date().getFullYear();

export const getSeedDaysOfWeek = () => [...(academicSeed.daysOfWeek || [])];

export const createClassKey = toClassKey;
