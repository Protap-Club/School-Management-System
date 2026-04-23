const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");

const uniqueEmail = (baseLocalPart, domain, seen) => {
  const base = `${baseLocalPart}@${domain}`;
  if (!seen.has(base)) {
    seen.set(base, 1);
    return base;
  }
  const next = seen.get(base) + 1;
  seen.set(base, next);
  return `${baseLocalPart}${next}@${domain}`;
};

/**
 * Build student records for a specific school.
 * @param {object} usersData - Full users.json data
 * @param {string} schoolCode - School code (JNV, NV, NVV)
 */
export const buildStudentRecords = (usersData, schoolCode) => {
  const { studentConfig: cfg, studentNamePools: pools } = usersData;
  const emailDomain = cfg.emailDomains[schoolCode] || "school.com";
  const firstNames = [...pools.maleFirstNames, ...pools.femaleFirstNames];
  const seenEmails = new Map();
  const records = [];
  let counter = 0;

  for (const standard of cfg.standards) {
    for (const section of cfg.sections) {
      const sectionRecords = [];

      for (let roll = 1; roll <= cfg.studentsPerSection; roll++) {
        counter += 1;
        const firstName = firstNames[counter % firstNames.length];
        const lastName = pools.lastNames[(counter + Number(standard)) % pools.lastNames.length];
        const fullName = `${firstName} ${lastName}`;
        const localPart = firstName.toLowerCase();
        const email = uniqueEmail(localPart, emailDomain, seenEmails);

        sectionRecords.push({
          index: counter,
          standard,
          section,
          firstName,
          lastName,
          fullName,
          email,
          fatherName: `${pools.fatherFirstNames[counter % pools.fatherFirstNames.length]} ${lastName}`,
          motherName: `${pools.motherFirstNames[counter % pools.motherFirstNames.length]} ${lastName}`,
          address: pools.addresses[counter % pools.addresses.length],
        });
      }

      sectionRecords
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .forEach((student, index) => {
          records.push({
            ...student,
            roll: index + 1,
          });
        });
    }
  }

  return records;
};
