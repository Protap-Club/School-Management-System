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
  const schoolDomain =
    usersData.studentConfig?.emailDomains?.[code] || `${code.toLowerCase()}.com`;

  let selectedName =
    teacherPool.find((name) => !usedNames.has(name.toLowerCase()));

  // fallback (still needed)
  if (!selectedName) {
    selectedName = `Teacher ${assignedClass.standard}${assignedClass.section}`;
  }

  usedNames.add(selectedName.toLowerCase());

  // ✅ CRITICAL FIX: guaranteed unique suffix
  const uniqueSuffix = `${assignedClass.standard}${assignedClass.section}-${index}`;

  return {
    name: selectedName,
    email: `${slugify(selectedName)}.${uniqueSuffix}@${schoolDomain}`,
    contactNo: buildTeacherContact(code, index),
  };
};

/**
 * KEY FIX: This function generates exactly 48 teachers (or as specified).
 * It distributes the 336 class-subject slots (48 classes * 7 subjects) among these 48 teachers.
 * Each teacher handles ~7 assignments for their specialized subject.
 */
export const buildTeacherSeedData = (code) => {
  const classSections = getSchoolClassSections(code);
  const existingTeachers = usersData[code]?.teachers || [];
  const TOTAL_TEACHERS = 48;

  // 1. Calculate Subject Demand across all classes
  const subjectDemand = {};
  let totalSlotsCount = 0;
  classSections.forEach((cls) => {
    const clsSubjects = getSubjectsForStandard(cls.standard);
    clsSubjects.forEach(sub => {
      subjectDemand[sub] = (subjectDemand[sub] || 0) + 1;
      totalSlotsCount++;
    });
  });

  const sortedSubjects = Object.keys(subjectDemand).sort((a, b) => subjectDemand[b] - subjectDemand[a]);

  // 2. Proportional Specialization Assignment
  // We want to map 48 teachers to these subjects based on demand
  const teacherSpecializations = [];
  let allocated = 0;
  
  sortedSubjects.forEach((sub, idx) => {
    // Each subject gets at least 1 teacher
    let count = Math.max(1, Math.round((subjectDemand[sub] / totalSlotsCount) * TOTAL_TEACHERS));
    // Adjustment for the last subject or if we exceed 48
    if (idx === sortedSubjects.length - 1) {
      count = TOTAL_TEACHERS - allocated;
    } else if (allocated + count > TOTAL_TEACHERS - (sortedSubjects.length - 1 - idx)) {
      count = 1; // leave room for remaining subjects
    }
    
    for (let i = 0; i < count; i++) {
      if (teacherSpecializations.length < TOTAL_TEACHERS) {
        teacherSpecializations.push(sub);
      }
    }
    allocated += count;
  });

  // Final check/fill
  while (teacherSpecializations.length < TOTAL_TEACHERS) {
    teacherSpecializations.push(sortedSubjects[0]); // Fill with most common subject (usually Math/English)
  }

  // 3. Initialize Teacher Pool (48 records)
  const teachers = [];
  const usedNames = new Set(existingTeachers.map(t => String(t.name).toLowerCase()));

  for (let i = 0; i < TOTAL_TEACHERS; i++) {
    let teacherBase;
    if (i < existingTeachers.length) {
      teacherBase = { ...existingTeachers[i] };
    } else {
      const schoolDomain = usersData.studentConfig?.emailDomains?.[code] || `${code.toLowerCase()}.com`;
      let name = teacherPool.find(n => !usedNames.has(n.toLowerCase()));
      if (!name) name = `Teacher ${i + 1}`;
      usedNames.add(name.toLowerCase());

      teacherBase = {
        name,
        email: `${slugify(name)}.${i + 1}@${schoolDomain}`,
        contactNo: buildTeacherContact(code, i + 1),
      };
    }

    teachers.push({
      ...teacherBase,
      role: "teacher",
      employeeId: `${code}-T${String(i + 1).padStart(3, "0")}`,
      qualification: qualifications[i % qualifications.length],
      joiningDate: `2025-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 20) + 1).padStart(2, "0")}`,
      
      specialization: teacherSpecializations[i],
      subjects: [teacherSpecializations[i]],
      assignedClasses: [],
    });
  }

  // 4. Distribute all (Class-Subject) Slots
  const slotsToFulfill = [];
  classSections.forEach((cls) => {
    const clsSubjects = getSubjectsForStandard(cls.standard);
    clsSubjects.forEach(sub => {
      slotsToFulfill.push({
        standard: String(cls.standard),
        section: String(cls.section).toUpperCase(),
        subject: sub,
      });
    });
  });

  const teachersBySubject = {};
  teachers.forEach(t => {
    if (!teachersBySubject[t.specialization]) teachersBySubject[t.specialization] = [];
    teachersBySubject[t.specialization].push(t);
  });

  const assignmentCount = new Map(teachers.map(t => [t.email, 0]));

  slotsToFulfill.forEach((slot) => {
    let subjectTeachers = teachersBySubject[slot.subject];
    
    // Fallback: if no teacher specializes in this specific subject (rare), 
    // pick teacher with least assignments
    if (!subjectTeachers || subjectTeachers.length === 0) {
      subjectTeachers = teachers;
    }

    // Sort by current load to pick the least busy teacher
    subjectTeachers.sort((a, b) => assignmentCount.get(a.email) - assignmentCount.get(b.email));
    const targetTeacher = subjectTeachers[0];

    // Add to their assignedClasses
    let existingAssignment = targetTeacher.assignedClasses.find(
      ac => ac.standard === slot.standard && ac.section === slot.section
    );

    if (existingAssignment) {
      if (!existingAssignment.subjects.includes(slot.subject)) {
        existingAssignment.subjects.push(slot.subject);
      }
    } else {
      targetTeacher.assignedClasses.push({
        standard: slot.standard,
        section: slot.section,
        subjects: [slot.subject]
      });
    }

    assignmentCount.set(targetTeacher.email, assignmentCount.get(targetTeacher.email) + 1);
  });

  return teachers;
};

export const getAcademicYear = () => usersData.studentConfig?.year || new Date().getFullYear();

export const getSeedDaysOfWeek = () => [...(academicSeed.daysOfWeek || [])];

export const createClassKey = toClassKey;