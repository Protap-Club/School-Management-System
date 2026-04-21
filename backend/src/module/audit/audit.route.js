import express from 'express';
import * as auditController from './audit.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { getAuditLogsSchema } from './audit.validation.js';
import { checkRole } from '../../middlewares/role.middleware.js';
import { USER_ROLES } from '../../constants/userRoles.js';

const router = express.Router();

// Only Super Admin can access audit logs
router.use(checkRole([USER_ROLES.SUPER_ADMIN]));

router.get('/', validate(getAuditLogsSchema), auditController.getAuditLogs);

export default router;
