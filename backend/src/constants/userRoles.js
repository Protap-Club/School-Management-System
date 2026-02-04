export const USER_ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student"
});

export const VALID_ROLES = Object.freeze(Object.values(USER_ROLES));

// Role hierarchy - defines what roles each role can manage/view
// Used for both creation and viewing permissions
export const ROLE_HIERARCHY = Object.freeze({
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
  [USER_ROLES.ADMIN]: [USER_ROLES.TEACHER, USER_ROLES.STUDENT],
  [USER_ROLES.TEACHER]: [USER_ROLES.STUDENT],
  [USER_ROLES.STUDENT]: []
});

// Check if a role can manage another role
export const canManageRole = (actorRole, targetRole) => {
  const allowedRoles = ROLE_HIERARCHY[actorRole] || [];
  return allowedRoles.includes(targetRole);
};

// Get all roles that an actor can manage
 export const getManageableRoles = (actorRole) => {
  return ROLE_HIERARCHY[actorRole] || [];
};

// Check if the actor is strictly "above" the target
// Useful to prevent Admins from modifying other Admins.
export const isSuperior = (actorRole, targetRole) => {
  const hierarchyOrder = [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.TEACHER,
    USER_ROLES.STUDENT,
  ];
  return hierarchyOrder.indexOf(actorRole) < hierarchyOrder.indexOf(targetRole);
};