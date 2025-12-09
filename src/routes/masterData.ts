import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireTenantContext } from '../middleware/tenantContext';
import { requirePermission } from '../middleware/permission';
import { masterDataService } from '../services/masterDataService';
import {
  createBrandSchema,
  updateBrandSchema,
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  queryMasterDataSchema,
} from '../schemas/masterDataSchemas';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenantContext());

// ============================================
// Brands Routes
// ============================================

router.get(
  '/brands',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const filters = queryMasterDataSchema.parse(req.query);
      const { brands, total } = await masterDataService.getBrands(tenantId, filters);

      res.json({ success: true, brands, total });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

// Template and export routes must come BEFORE /:id routes to avoid route conflicts
router.get(
  '/brands/template',
  requirePermission('master_data:bulk_upload'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const buffer = masterDataService.generateBrandTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=brands_template.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/brands/export',
  requirePermission('master_data:export'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const buffer = await masterDataService.exportBrands(tenantId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=brands.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/brands/:id',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const brand = await masterDataService.getBrandById(tenantId, req.params.id);
      res.json({ success: true, brand });
    } catch (error: any) {
      if (error.message === 'Brand not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/brands',
  requirePermission('master_data:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = createBrandSchema.parse(req.body);
      const brand = await masterDataService.createBrand(
        tenantId,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, brand });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

router.patch(
  '/brands/:id',
  requirePermission('master_data:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = updateBrandSchema.parse(req.body);
      const brand = await masterDataService.updateBrand(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, brand });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Brand not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.delete(
  '/brands/:id',
  requirePermission('master_data:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const brand = await masterDataService.deleteBrand(
        tenantId,
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Brand archived successfully.', brand });
    } catch (error: any) {
      if (error.message === 'Brand not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/brands/bulk-upload',
  requirePermission('master_data:bulk_upload'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File is required.' });
      }

      const result = await masterDataService.bulkUploadBrands(
        tenantId,
        req.file.buffer,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, result });
    } catch (error: any) {
      next(error);
    }
  }
);

// ============================================
// Categories Routes
// ============================================

router.get(
  '/categories',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const filters = queryMasterDataSchema.parse(req.query);
      const { categories, total } = await masterDataService.getCategories(tenantId, filters);

      res.json({ success: true, categories, total });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

// Template and export routes must come BEFORE /:id routes
router.get(
  '/categories/template',
  requirePermission('master_data:bulk_upload'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const buffer = masterDataService.generateCategoryTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=categories_template.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/categories/export',
  requirePermission('master_data:export'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const buffer = await masterDataService.exportCategories(tenantId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=categories.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/categories/:id',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const category = await masterDataService.getCategoryById(tenantId, req.params.id);
      res.json({ success: true, category });
    } catch (error: any) {
      if (error.message === 'Category not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/categories',
  requirePermission('master_data:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = createCategorySchema.parse(req.body);
      const category = await masterDataService.createCategory(
        tenantId,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, category });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

router.patch(
  '/categories/:id',
  requirePermission('master_data:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = updateCategorySchema.parse(req.body);
      const category = await masterDataService.updateCategory(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, category });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Category not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.delete(
  '/categories/:id',
  requirePermission('master_data:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const category = await masterDataService.deleteCategory(
        tenantId,
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Category archived successfully.', category });
    } catch (error: any) {
      if (error.message === 'Category not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/categories/bulk-upload',
  requirePermission('master_data:bulk_upload'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File is required.' });
      }

      const result = await masterDataService.bulkUploadCategories(
        tenantId,
        req.file.buffer,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, result });
    } catch (error: any) {
      next(error);
    }
  }
);

// ============================================
// Products Routes
// ============================================

router.get(
  '/products',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const filters = queryMasterDataSchema.parse(req.query);
      const { products, total } = await masterDataService.getProducts(tenantId, filters);

      res.json({ success: true, products, total });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

// Template and export routes must come BEFORE /:id routes
router.get(
  '/products/template',
  requirePermission('master_data:bulk_upload'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const buffer = masterDataService.generateProductTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=products_template.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/products/export',
  requirePermission('master_data:export'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const buffer = await masterDataService.exportProducts(tenantId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  '/products/:id',
  requirePermission('master_data:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required.' });
      }

      const product = await masterDataService.getProductById(tenantId, req.params.id);
      res.json({ success: true, product });
    } catch (error: any) {
      if (error.message === 'Product not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/products',
  requirePermission('master_data:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = createProductSchema.parse(req.body);
      const product = await masterDataService.createProduct(
        tenantId,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, product });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      next(error);
    }
  }
);

router.patch(
  '/products/:id',
  requirePermission('master_data:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const data = updateProductSchema.parse(req.body);
      const product = await masterDataService.updateProduct(
        tenantId,
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, product });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      if (error.message === 'Product not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.delete(
  '/products/:id',
  requirePermission('master_data:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      const product = await masterDataService.deleteProduct(
        tenantId,
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Product archived successfully.', product });
    } catch (error: any) {
      if (error.message === 'Product not found.') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

router.post(
  '/products/bulk-upload',
  requirePermission('master_data:bulk_upload'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req;
      if (!tenantId || !userId) {
        return res.status(400).json({ error: 'Tenant ID and User ID are required.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File is required.' });
      }

      const result = await masterDataService.bulkUploadProducts(
        tenantId,
        req.file.buffer,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
