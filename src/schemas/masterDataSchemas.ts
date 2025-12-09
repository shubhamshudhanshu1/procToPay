import { z } from 'zod';

// Brand Schemas
export const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  }),
  description: z.string().max(1000).optional().nullable(),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
});

// Category Schemas
export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  }),
  description: z.string().max(1000).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
});

// Product Schemas
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  }),
  description: z.string().max(1000).optional().nullable(),
  brandCode: z.string().min(1), // Reference by code
  categoryCode: z.string().min(1), // Reference by code
  price: z.number().positive().optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/).optional(),
  description: z.string().max(1000).optional().nullable(),
  brandId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
});

// Query Schemas
export const queryMasterDataSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
  limit: z.string().transform(Number).default('20'),
  offset: z.string().transform(Number).default('0'),
});

// Bulk Upload Schema (for Excel row validation)
export const bulkUploadBrandRowSchema = z.object({
  Name: z.string().min(1),
  Code: z.string().min(1),
  Description: z.string().optional().nullable(),
});

export const bulkUploadCategoryRowSchema = z.object({
  Name: z.string().min(1),
  Code: z.string().min(1),
  Description: z.string().optional().nullable(),
});

export const bulkUploadProductRowSchema = z.object({
  Name: z.string().min(1),
  Code: z.string().min(1),
  Description: z.string().optional().nullable(),
  'Brand Code': z.string().min(1),
  'Category Code': z.string().min(1),
  Price: z.string().transform((val) => {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }).optional().nullable(),
});

