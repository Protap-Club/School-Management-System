import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildTeacherSeedData,
  getSchoolClassSections,
  getSubjectsForStandard,
} from "../../src/seed/lib/generatedAcademicSeed.js";
import { timetableSeedInternals } from "../../src/seed/commands/seedTimetable.js";
import { buildStudentRecords } from "../../src/seed/lib/studentRecords.js";

const readSeedJson = (fileName) =>
  JSON.parse(readFileSync(new URL(`../../src/seed/data/${fileName}`, import.meta.url), "utf8"));

const schools = readSeedJson("schools.json").schools;
const usersData = readSeedJson("users.json");
const timetableData = readSeedJson("timetable.json");

const classKeyFor = (value) => `${value.standard}-${value.section}`.toUpperCase();

describe("academic seed consistency", () => {
  it("assigns exactly one class teacher and one subject teacher per class-subject slot", () => {
    schools.forEach((school) => {
      const classSections = getSchoolClassSections(school.code);
      const teachers = buildTeacherSeedData(school.code);
      const classTeacherMap = new Map();
      const classSubjectOwnerMap = new Map();

      expect(teachers).toHaveLength(classSections.length);

      teachers.forEach((teacher) => {
        expect(teacher.classTeacherOf).toMatchObject({
          standard: expect.any(String),
          section: expect.any(String),
        });

        const classTeacherKey = classKeyFor(teacher.classTeacherOf);
        expect(classTeacherMap.has(classTeacherKey)).toBe(false);
        classTeacherMap.set(classTeacherKey, teacher.email);

        const assignedSubjectSet = new Set();
        const assignedStandards = new Set();
        teacher.assignedClasses.forEach((assignedClass) => {
          assignedStandards.add(Number(assignedClass.standard));
          assignedClass.subjects.forEach((subject) => {
            assignedSubjectSet.add(subject);
            const ownerKey = `${assignedClass.standard}-${assignedClass.section}-${subject}`.toUpperCase();
            expect(classSubjectOwnerMap.has(ownerKey)).toBe(false);
            classSubjectOwnerMap.set(ownerKey, teacher.email);
          });
        });

        expect(new Set(teacher.subjects)).toEqual(assignedSubjectSet);

        const homeStandard = Number(teacher.classTeacherOf.standard);
        if (homeStandard > 1 && homeStandard < 12) {
          expect([...assignedStandards].some((standard) => Math.abs(standard - homeStandard) === 1)).toBe(true);
        }
      });

      classSections.forEach((classSection) => {
        expect(classTeacherMap.has(classKeyFor(classSection))).toBe(true);

        getSubjectsForStandard(classSection.standard).forEach((subject) => {
          const ownerKey = `${classSection.standard}-${classSection.section}-${subject}`.toUpperCase();
          expect(classSubjectOwnerMap.has(ownerKey)).toBe(true);
        });
      });
    });
  });

  it("keeps generated student rolls alphabetical within each class section", () => {
    schools.forEach((school) => {
      const classSections = getSchoolClassSections(school.code);
      const students = buildStudentRecords(usersData, school.code);
      const studentEmails = new Set(students.map((student) => student.email));

      expect(studentEmails.size).toBe(students.length);

      classSections.forEach((classSection) => {
        const sectionStudents = students.filter(
          (student) =>
            student.standard === String(classSection.standard) &&
            student.section === String(classSection.section)
        );
        const sortedNames = sectionStudents
          .map((student) => student.fullName)
          .sort((left, right) => left.localeCompare(right));

        expect(sectionStudents.map((student) => student.fullName)).toEqual(sortedNames);
        expect(sectionStudents.map((student) => student.roll)).toEqual(
          Array.from({ length: sectionStudents.length }, (_, index) => index + 1)
        );
      });
    });
  });

  it("builds a full conflict-free timetable plan from seeded teacher assignments", () => {
    const slotCount = timetableData.timeSlots.filter((slot) => slot.slotType === "CLASS").length;

    schools.forEach((school) => {
      const classSections = getSchoolClassSections(school.code);
      const teachers = buildTeacherSeedData(school.code);
      const teacherProfiles = teachers.map((teacher) => ({
        userId: teacher.email,
        assignedClasses: teacher.assignedClasses,
      }));
      const assignmentMap = timetableSeedInternals.buildAssignmentMap(teacherProfiles);
      const slotPlan = timetableSeedInternals.buildSlotPlan(
        classSections,
        assignmentMap,
        slotCount,
        school.code
      );

      expect(slotPlan).toHaveLength(classSections.length * slotCount);

      for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const periodsInSlot = slotPlan.filter((period) => period.slotIndex === slotIndex);
        expect(new Set(periodsInSlot.map((period) => period.classKey)).size).toBe(classSections.length);
        expect(new Set(periodsInSlot.map((period) => period.teacherId)).size).toBe(classSections.length);
      }
    });
  });
});
