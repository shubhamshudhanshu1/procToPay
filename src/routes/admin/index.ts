import { Router } from 'express';
import rolesRouter from './roles';
import permissionsRouter from './permissions';
import tenantsRouter from './tenants';
import usersRouter from './users';
import auditLogsRouter from './audit-logs';

const router: Router = Router();

// Mount admin routes
router.use('/roles', rolesRouter);
router.use('/permissions', permissionsRouter);
router.use('/tenants', tenantsRouter);
router.use('/users', usersRouter);
router.use('/audit-logs', auditLogsRouter);

export default router;

