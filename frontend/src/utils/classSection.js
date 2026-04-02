export const normalizeClassSection = (input = {}) => ({
    standard: String(input?.standard || "").trim(),
    section: String(input?.section || "").trim().toUpperCase(),
});

export const makeClassKey = (standardOrInput, maybeSection) => {
    const normalized =
        typeof standardOrInput === "object" && standardOrInput !== null
            ? normalizeClassSection(standardOrInput)
            : normalizeClassSection({ standard: standardOrInput, section: maybeSection });

    return `${normalized.standard.toLowerCase()}::${normalized.section}`;
};

export const sortClassSections = (items = []) =>
    [...items].sort((a, b) => {
        const first = normalizeClassSection(a);
        const second = normalizeClassSection(b);
        const numA = Number.parseInt(first.standard, 10);
        const numB = Number.parseInt(second.standard, 10);

        if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
            return numA - numB;
        }

        const standardCompare = first.standard.localeCompare(second.standard, undefined, {
            numeric: true,
            sensitivity: "base",
        });

        if (standardCompare !== 0) {
            return standardCompare;
        }

        return first.section.localeCompare(second.section, undefined, {
            sensitivity: "base",
        });
    });
