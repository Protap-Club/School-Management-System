import { loadSeedJson } from "./loadJson.js";

const usersData = loadSeedJson("users.json");
const schoolData = loadSeedJson("schools.json");
const academicSeed = loadSeedJson("academicSeed.json");

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

const buildGeneratedTeacherIdentity = (code, index, assignedClass, usedNames) => {
  const schoolDomain = usersData.studentConfig?.emailDomains?.[code] || `${code.toLowerCase()}.com`;
  let selectedName =
    teacherPool.find((name) => !usedNames.has(name.toLowerCase())) ||
    `Teacher ${assignedClass.standard}${assignedClass.section}`;

  usedNames.add(selectedName.toLowerCase());

  return {
    name: selectedName,
    email: `${slugify(selectedName)}.${String(assignedClass.standard)}${String(assignedClass.section).toLowerCase()}@${schoolDomain}`,
    contactNo: buildTeacherContact(code, index),
  };
};

export const buildTeacherSeedData = (code) => {
  const classSections = getSchoolClassSections(code);
  const existingTeachers = usersData[code]?.teachers || [];
  const usedNames = new Set(existingTeachers.map((teacher) => String(teacher.name).toLowerCase()));

  return classSections.map((assignedClass, index) => {
    const teacherIdentity =
      existingTeachers[index] || buildGeneratedTeacherIdentity(code, index + 1, assignedClass, usedNames);
    const subjects = getSubjectsForStandard(assignedClass.standard);

    return {
      ...teacherIdentity,
      role: "teacher",
      employeeId: `${code}-T${String(index + 1).padStart(3, "0")}`,
      qualification: qualifications[index % qualifications.length],
      joiningDate: `2025-${String((index % 9) + 1).padStart(2, "0")}-${String((index % 20) + 1).padStart(2, "0")}`,
      assignedClass: {
        standard: String(assignedClass.standard),
        section: String(assignedClass.section).toUpperCase(),
      },
      assignedClasses: [
        {
          standard: String(assignedClass.standard),
          section: String(assignedClass.section).toUpperCase(),
          subjects,
        },
      ],
      subjects,
      roomNumber: `Class ${assignedClass.standard}-${String(assignedClass.section).toUpperCase()}`,
      classKey: toClassKey(assignedClass),
    };
  });
};

export const getAcademicYear = () => usersData.studentConfig?.year || new Date().getFullYear();

export const getSeedDaysOfWeek = () => [...(academicSeed.daysOfWeek || [])];

export const createClassKey = toClassKey;
