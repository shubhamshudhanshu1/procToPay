import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireTenantContext } from '../middleware/tenantContext';
import { requirePermission } from '../middleware/permission';
import { totAgreementService } from '../services/totAgreementService';
import {
  createTotAgreementSchema,
  updateTotAgreementSchema,
  queryTotAgreementsSchema,
  approveTotAgreementSchema,
  rejectTotAgreementSchema,
} from '../schemas/totAgreementSchemas';

const router: Router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenantContext());

/**
 * GET /api/tot-agreements
 * List agreements with search, filter, and pagination
 */
router.get(
  '/',
  requirePermission('tot_agreement:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = queryTotAgreementsSchema.parse(req.query);
      const tenantId = req.tenantId!;
      const result = await totAgreementService.getAgreements(tenantId, query);
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
 * GET /api/tot-agreements/:id
 * Get single agreement
 */
router.get(
  '/:id',
  requirePermission('tot_agreement:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const agreement = await totAgreementService.getAgreementById(tenantId, req.params.id);
      res.json({ success: true, agreement });
    } catch (error: any) {
      if (error.message === 'Agreement not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * POST /api/tot-agreements
 * Create new agreement
 */
router.post(
  '/',
  requirePermission('tot_agreement:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createTotAgreementSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const agreement = await totAgreementService.createAgreement(
        tenantId,
        data,
        userId,
        req.ip,
        req.get('user-agent')
      );
      res.status(201).json({ success: true, agreement });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (
        error.message === 'Brand not found' ||
        error.message === 'Template not found' ||
        error.message === 'One or more categories not found' ||
        error.message.includes('Required parameter')
      ) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/tot-agreements/:id
 * Update agreement
 */
router.patch(
  '/:id',
  requirePermission('tot_agreement:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateTotAgreementSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const agreement = await totAgreementService.updateAgreement(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.get('user-agent')
      );
      res.json({ success: true, agreement });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (
        error.message === 'Agreement not found' ||
        error.message === 'Only draft agreements can be edited' ||
        error.message === 'Brand not found' ||
        error.message === 'Template not found' ||
        error.message === 'One or more categories not found' ||
        error.message.includes('Required parameter')
      ) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/tot-agreements/:id
 * Delete agreement
 */
router.delete(
  '/:id',
  requirePermission('tot_agreement:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      await totAgreementService.deleteAgreement(tenantId, req.params.id, userId, req.ip, req.get('user-agent'));
      res.json({ success: true, message: 'Agreement deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Agreement not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Only draft or rejected agreements can be deleted') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * POST /api/tot-agreements/:id/approve
 * Approve agreement
 */
router.post(
  '/:id/approve',
  requirePermission('tot_agreement:approve'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      approveTotAgreementSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const agreement = await totAgreementService.approveAgreement(
        tenantId,
        req.params.id,
        userId,
        req.ip,
        req.get('user-agent')
      );
      res.json({ success: true, agreement });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Agreement not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Only pending approval agreements can be approved') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * POST /api/tot-agreements/:id/reject
 * Reject agreement
 */
router.post(
  '/:id/reject',
  requirePermission('tot_agreement:reject'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = rejectTotAgreementSchema.parse(req.body);
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const agreement = await totAgreementService.rejectAgreement(
        tenantId,
        req.params.id,
        userId,
        data.reason,
        req.ip,
        req.get('user-agent')
      );
      res.json({ success: true, agreement });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Agreement not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Only pending approval agreements can be rejected') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

export default router;

