import School from "../module/school/School.model.js";
import { BadRequestError, NotFoundError } from "./customError.js";

export const normalizeClassSection = ({ standard, section } = {}) => ({
    standard: String(standard || "").trim(),
    section: String(section || "").trim().toUpperCase(),
});

export const buildClassSectionKey = (standard, section) =>
    `${String(standard || "").trim().toLowerCase()}::${String(section || "").trim().toUpperCase()}`;

export const sortClassSections = (items = []) =>
    [...items].sort((a, b) => {
        const numA = Number.parseInt(a.standard, 10);
        const numB = Number.parseInt(b.standard, 10);

        if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
            return numA - numB;
        }

        const standardCompare = String(a.standard || "").localeCompare(String(b.standard || ""), undefined, {
            numeric: true,
            sensitivity: "base",
        });

        if (standardCompare !== 0) {
            return standardCompare;
        }

        return String(a.section || "").localeCompare(String(b.section || ""), undefined, {
            sensitivity: "base",
        });
    });

export const getConfiguredClassSections = async (schoolId, options = {}) => {
    const { school: providedSchool = null, throwIfMissing = true } = options;

    const school =
        providedSchool ||
        await School.findById(schoolId)
            .select("academic.classSections")
            .lean();

    if (!school) {
        if (!throwIfMissing) {
            return {
                school: null,
                classSections: [],
                keySet: new Set(),
            };
        }

        throw new NotFoundError("School not found");
    }

    const uniqueByKey = new Map();

    for (const item of school?.academic?.classSections || []) {
        const normalized = normalizeClassSection(item);
        if (!normalized.standard || !normalized.section) continue;

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, normalized);
        }
    }

    const classSections = sortClassSections([...uniqueByKey.values()]);
    return {
        school,
        classSections,
        keySet: new Set(uniqueByKey.keys()),
    };
};

export const assertClassSectionExists = async (
    schoolId,
    standard,
    section,
    options = {}
) => {
    const {
        school = null,
        message = "Selected class-section is not configured in Settings",
    } = options;

    const normalized = normalizeClassSection({ standard, section });
    if (!normalized.standard || !normalized.section) {
        throw new BadRequestError("Standard and section are required");
    }

    const { keySet } = await getConfiguredClassSections(schoolId, { school });

    if (!keySet.has(buildClassSectionKey(normalized.standard, normalized.section))) {
        throw new BadRequestError(message);
    }

    return normalized;
};

export const assertClassSectionListExists = async (schoolId, classSections = [], options = {}) => {
    const {
        school = null,
        requireNonEmpty = false,
        message = "One or more selected class-sections are not configured in Settings",
    } = options;

    if (!Array.isArray(classSections)) {
        throw new BadRequestError("Class-section list must be an array");
    }

    if (requireNonEmpty && classSections.length === 0) {
        throw new BadRequestError("At least one class-section is required");
    }

    const { keySet } = await getConfiguredClassSections(schoolId, { school });
    const normalizedList = [];
    const invalidItems = [];
    const seen = new Set();

    for (const item of classSections) {
        const normalized = normalizeClassSection(item);
        if (!normalized.standard || !normalized.section) {
            invalidItems.push(item);
            continue;
        }

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!keySet.has(key)) {
            invalidItems.push(item);
            continue;
        }

        if (!seen.has(key)) {
            seen.add(key);
            normalizedList.push(normalized);
        }
    }

    if (invalidItems.length > 0) {
        throw new BadRequestError(message);
    }

    return normalizedList;
};
