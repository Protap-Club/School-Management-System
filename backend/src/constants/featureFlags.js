// Feature Flags - Available modules that can be enabled/disabled per school.
// Each key corresponds to a boolean field in the School schema 'features' object.

export const SCHOOL_FEATURES = Object.freeze({
  ATTENDANCE: {
    key: "attendance",
    label: "Attendance Management",
    description: "Track student attendance via NFC",
  },
  FEES: {
    key: "fees",
    label: "Fee Management",
    description: "Manage student fees and payments",
  },
  TIMETABLE: {
    key: "timetable",
    label: "Timetable",
    description: "Class and exam schedules",
  },
  LIBRARY: {
    key: "library",
    label: "Library Management",
    description: "Book inventory and borrowing",
  },
  TRANSPORT: {
    key: "transport",
    label: "Transport Management",
    description: "Bus routes and tracking",
  },
  NOTICE: {
    key: "notice",
    label: "Notice Board",
    description: "School announcements and notifications",
  },
  CALENDAR: {
    key: "calendar",
    label: "Calendar",
    description: "calendar events",
  },
  EXAMINATION: {
    key: "examination",
    label: "Examination Management",
    description: "Manage term exams and class tests",
  },
  ASSIGNMENT: {
    key: "assignment",
    label: "Assignment Management",
    description: "Create, distribute, and collect assignments",
  },
  RESULT: {
    key: "result",
    label: "Result Management",
    description: "Manage and publish student exam results",
  },
});

// Pre-computed array of feature keys for validation and schema mapping.
export const VALID_FEATURE_KEYS = Object.freeze(
  Object.values(SCHOOL_FEATURES).map((f) => f.key)
);

// Helper Functions 

// Get all feature keys (e.g., ['attendance', 'fees', ...])
export const getFeatureKeys = () => VALID_FEATURE_KEYS;

// Find the full feature object (label/description) by its key string
export const getFeatureByKey = (key) =>
  Object.values(SCHOOL_FEATURES).find((f) => f.key === key);

// Validates if a string is a recognized system feature
export const isValidFeatureKey = (key) => VALID_FEATURE_KEYS.includes(key);