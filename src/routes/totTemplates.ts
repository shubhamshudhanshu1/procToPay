import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireTenantContext } from '../middleware/tenantContext';
import { requirePermission } from '../middleware/permission';
import { totTemplateService } from '../services/totTemplateService';
import {
  createTemplateSchema,
  updateTemplateSchema,
  queryTemplatesSchema,
  duplicateTemplateSchema,
} from '../schemas/totTemplateSchemas';

const router: Router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenantContext());

/**
 * GET /api/tot-templates
 * List templates with search, filter, and pagination
 */
router.get(
  '/',
  requirePermission('tot_template:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = queryTemplatesSchema.parse(req.query);
      const tenantId = req.tenantId!;
      const result = await totTemplateService.getTemplates(tenantId, query);
      res.json({ success: true, ...result });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      next(error);
    }
  }
);

/**
 * GET /api/tot-templates/:id
 * Get single template
 */
router.get(
  '/:id',
  requirePermission('tot_template:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const template = await totTemplateService.getTemplateById(tenantId, req.params.id);
      res.json({ success: true, template });
    } catch (error: any) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * POST /api/tot-templates
 * Create new template
 */
router.post(
  '/',
  requirePermission('tot_template:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createTemplateSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const template = await totTemplateService.createTemplate(
        tenantId,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, template });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/tot-templates/:id
 * Update template
 */
router.patch(
  '/:id',
  requirePermission('tot_template:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateTemplateSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const template = await totTemplateService.updateTemplate(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, template });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (
        error.message === 'Template not found' ||
        error.message === 'TOT Template not found.' ||
        error.message.includes('not found')
      ) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * POST /api/tot-templates/:id/duplicate
 * Duplicate template
 */
router.post(
  '/:id/duplicate',
  requirePermission('tot_template:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = duplicateTemplateSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const template = await totTemplateService.duplicateTemplate(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, template });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * GET /api/tot-templates/:id/versions
 * Get version history
 */
router.get(
  '/:id/versions',
  requirePermission('tot_template:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const versions = await totTemplateService.getVersionHistory(tenantId, req.params.id);
      res.json({ success: true, versions });
    } catch (error: any) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/tot-templates/:id
 * Delete template
 */
router.delete(
  '/:id',
  requirePermission('tot_template:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      await totTemplateService.deleteTemplate(
        tenantId,
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

export default router;
