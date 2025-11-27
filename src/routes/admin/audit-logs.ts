import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requireSuperAdmin, AuthenticatedRequest } from '../../middleware/permission';
import { auditService } from '../../services/auditService';
import { auditLogFilterSchema } from '../../schemas/adminSchemas';

const router: Router = Router();

/**
 * GET /api/admin/audit-logs
 * Get global audit logs with filters
 */
router.get('/', requireSuperAdmin(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = auditLogFilterSchema.parse({
      tenantId: req.query.tenantId,
      actorUserId: req.query.actorUserId,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });

    // Convert date strings to Date objects
    const processedFilters: any = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const logs = await auditService.getAuditLogs(processedFilters);

    res.json({ success: true, logs });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return next(error);
    }
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 500;
    next(err);
  }
});

/**
 * GET /api/admin/tenants/:tenantId/audit-logs
 * Get audit logs for a specific tenant
 */
router.get('/tenants/:tenantId', requireSuperAdmin(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.tenantId;
    const filters = auditLogFilterSchema.parse({
      actorUserId: req.query.actorUserId,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });

    // Convert date strings to Date objects
    const processedFilters: any = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const logs = await auditService.getTenantAuditLogs(tenantId, processedFilters);

    res.json({ success: true, logs });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return next(error);
    }
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 500;
    next(err);
  }
});

export default router;

