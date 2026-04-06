export const USER_ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student"
});

// Role hierarchy (higher number = more power)
const ROLE_LEVELS = Object.freeze({
  [USER_ROLES.SUPER_ADMIN]: 4,
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.TEACHER]: 2,
  [USER_ROLES.STUDENT]: 1
});

// Defines which user roles each role is allowed to view/manage.
export const VIEWABLE_ROLES = Object.freeze({
  [USER_ROLES.TEACHER]: [USER_ROLES.STUDENT], // Teachers can only view students
  [USER_ROLES.ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
});

// Check if actor can manage target role
export const canManageRole = (actorRole, targetRole) => {
  return ROLE_LEVELS[actorRole] > ROLE_LEVELS[targetRole];
};

// Get all roles that actor can manage
export const getManageableRoles = (actorRole) => {
  const actorLevel = ROLE_LEVELS[actorRole];
  return Object.keys(ROLE_LEVELS).filter(
    role => ROLE_LEVELS[role] < actorLevel
  );
};

