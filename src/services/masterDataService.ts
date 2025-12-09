import { prisma } from '../db/prisma';
import { auditService } from './auditService';
import {
  CreateBrandInput,
  UpdateBrandInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  QueryMasterDataFilters,
  BulkUploadResult,
} from '../types/masterData';
import * as XLSX from 'xlsx';
import {
  bulkUploadBrandRowSchema,
  bulkUploadCategoryRowSchema,
  bulkUploadProductRowSchema,
} from '../schemas/masterDataSchemas';

class MasterDataService {
  // ============================================
  // Brands
  // ============================================

  async getBrands(tenantId: string, filters: QueryMasterDataFilters) {
    const { search, status, limit, offset } = filters;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [brands, total] = await prisma.$transaction([
      prisma.brand.findMany({
        where,
        include: { creator: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.brand.count({ where }),
    ]);

    return { brands, total };
  }

  async getBrandById(tenantId: string, id: string) {
    const brand = await prisma.brand.findFirst({
      where: { id, tenantId },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!brand) {
      throw new Error('Brand not found.');
    }
    return brand;
  }

  async createBrand(
    tenantId: string,
    data: CreateBrandInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Check for unique name and code within tenant
    const existing = await prisma.brand.findFirst({
      where: {
        tenantId,
        OR: [{ name: data.name }, { code: data.code }],
      },
    });
    if (existing) {
      throw new Error(
        existing.name === data.name
          ? `Brand with name "${data.name}" already exists.`
          : `Brand with code "${data.code}" already exists.`
      );
    }

    const brand = await prisma.brand.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        createdBy: actorUserId,
      },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.brand.create',
      resource: `brand:${brand.id}`,
      afterJson: brand,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return brand;
  }

  async updateBrand(
    tenantId: string,
    id: string,
    data: UpdateBrandInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingBrand = await this.getBrandById(tenantId, id);

    // Check for unique name/code if being updated
    if (data.name || data.code) {
      const conflict = await prisma.brand.findFirst({
        where: {
          tenantId,
          id: { not: id },
          OR: data.name ? [{ name: data.name }] : data.code ? [{ code: data.code }] : [],
        },
      });
      if (conflict) {
        throw new Error(
          conflict.name === data.name
            ? `Brand with name "${data.name}" already exists.`
            : `Brand with code "${data.code}" already exists.`
        );
      }
    }

    const updatedBrand = await prisma.brand.update({
      where: { id, tenantId },
      data: {
        ...data,
        updatedBy: actorUserId,
      },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.brand.update',
      resource: `brand:${id}`,
      beforeJson: existingBrand,
      afterJson: updatedBrand,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return updatedBrand;
  }

  async deleteBrand(
    tenantId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingBrand = await this.getBrandById(tenantId, id);

    // Check if brand is used by products
    const productCount = await prisma.product.count({
      where: { tenantId, brandId: id },
    });
    if (productCount > 0) {
      throw new Error(`Cannot delete brand. It is used by ${productCount} product(s).`);
    }

    // Soft delete
    const deletedBrand = await prisma.brand.update({
      where: { id, tenantId },
      data: {
        status: 'archived',
        updatedBy: actorUserId,
      },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.brand.delete',
      resource: `brand:${id}`,
      beforeJson: existingBrand,
      afterJson: deletedBrand,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return deletedBrand;
  }

  // ============================================
  // Categories
  // ============================================

  async getCategories(tenantId: string, filters: QueryMasterDataFilters) {
    const { search, status, limit, offset } = filters;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        include: { creator: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.category.count({ where }),
    ]);

    return { categories, total };
  }

  async getCategoryById(tenantId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, tenantId },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!category) {
      throw new Error('Category not found.');
    }
    return category;
  }

  async createCategory(
    tenantId: string,
    data: CreateCategoryInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.category.findFirst({
      where: {
        tenantId,
        OR: [{ name: data.name }, { code: data.code }],
      },
    });
    if (existing) {
      throw new Error(
        existing.name === data.name
          ? `Category with name "${data.name}" already exists.`
          : `Category with code "${data.code}" already exists.`
      );
    }

    const category = await prisma.category.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        createdBy: actorUserId,
      },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.category.create',
      resource: `category:${category.id}`,
      afterJson: category,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return category;
  }

  async updateCategory(
    tenantId: string,
    id: string,
    data: UpdateCategoryInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingCategory = await this.getCategoryById(tenantId, id);

    if (data.name || data.code) {
      const conflict = await prisma.category.findFirst({
        where: {
          tenantId,
          id: { not: id },
          OR: data.name ? [{ name: data.name }] : data.code ? [{ code: data.code }] : [],
        },
      });
      if (conflict) {
        throw new Error(
          conflict.name === data.name
            ? `Category with name "${data.name}" already exists.`
            : `Category with code "${data.code}" already exists.`
        );
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id, tenantId },
      data: {
        ...data,
        updatedBy: actorUserId,
      },
      include: { creator: { select: { firstName: true, lastName: true, email: true } } },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.category.update',
      resource: `category:${id}`,
      beforeJson: existingCategory,
      afterJson: updatedCategory,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return updatedCategory;
  }

  async deleteCategory(
    tenantId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingCategory = await this.getCategoryById(tenantId, id);

    const productCount = await prisma.product.count({
      where: { tenantId, categoryId: id },
    });
    if (productCount > 0) {
      throw new Error(`Cannot delete category. It is used by ${productCount} product(s).`);
    }

    const deletedCategory = await prisma.category.update({
      where: { id, tenantId },
      data: {
        status: 'archived',
        updatedBy: actorUserId,
      },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.category.delete',
      resource: `category:${id}`,
      beforeJson: existingCategory,
      afterJson: deletedCategory,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return deletedCategory;
  }

  // ============================================
  // Products
  // ============================================

  async getProducts(tenantId: string, filters: QueryMasterDataFilters) {
    const { search, status, limit, offset } = filters;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          creator: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async getProductById(tenantId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        brand: true,
        category: true,
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!product) {
      throw new Error('Product not found.');
    }
    return product;
  }

  async createProduct(
    tenantId: string,
    data: CreateProductInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Find brand and category by code
    const brand = await prisma.brand.findFirst({
      where: { tenantId, code: data.brandCode },
    });
    if (!brand) {
      throw new Error(`Brand with code "${data.brandCode}" not found.`);
    }

    const category = await prisma.category.findFirst({
      where: { tenantId, code: data.categoryCode },
    });
    if (!category) {
      throw new Error(`Category with code "${data.categoryCode}" not found.`);
    }

    // Check for unique name and code
    const existing = await prisma.product.findFirst({
      where: {
        tenantId,
        OR: [{ name: data.name }, { code: data.code }],
      },
    });
    if (existing) {
      throw new Error(
        existing.name === data.name
          ? `Product with name "${data.name}" already exists.`
          : `Product with code "${data.code}" already exists.`
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        brandId: brand.id,
        categoryId: category.id,
        price: data.price,
        createdBy: actorUserId,
      },
      include: {
        brand: true,
        category: true,
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.product.create',
      resource: `product:${product.id}`,
      afterJson: product,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return product;
  }

  async updateProduct(
    tenantId: string,
    id: string,
    data: UpdateProductInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingProduct = await this.getProductById(tenantId, id);

    // Validate brand/category if provided
    if (data.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: data.brandId, tenantId },
      });
      if (!brand) {
        throw new Error('Brand not found.');
      }
    }

    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, tenantId },
      });
      if (!category) {
        throw new Error('Category not found.');
      }
    }

    // Check for unique name/code
    if (data.name || data.code) {
      const conflict = await prisma.product.findFirst({
        where: {
          tenantId,
          id: { not: id },
          OR: data.name ? [{ name: data.name }] : data.code ? [{ code: data.code }] : [],
        },
      });
      if (conflict) {
        throw new Error(
          conflict.name === data.name
            ? `Product with name "${data.name}" already exists.`
            : `Product with code "${data.code}" already exists.`
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id, tenantId },
      data: {
        ...data,
        updatedBy: actorUserId,
      },
      include: {
        brand: true,
        category: true,
        creator: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.product.update',
      resource: `product:${id}`,
      beforeJson: existingProduct,
      afterJson: updatedProduct,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return updatedProduct;
  }

  async deleteProduct(
    tenantId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingProduct = await this.getProductById(tenantId, id);

    const deletedProduct = await prisma.product.update({
      where: { id, tenantId },
      data: {
        status: 'archived',
        updatedBy: actorUserId,
      },
    });

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.product.delete',
      resource: `product:${id}`,
      beforeJson: existingProduct,
      afterJson: deletedProduct,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return deletedProduct;
  }

  // ============================================
  // Bulk Upload
  // ============================================

  async bulkUploadBrands(
    tenantId: string,
    fileBuffer: Buffer,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkUploadResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const result: BulkUploadResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

      try {
        // Validate row
        const validated = bulkUploadBrandRowSchema.parse(row);

        // Check for duplicates
        const existing = await prisma.brand.findFirst({
          where: {
            tenantId,
            OR: [{ name: validated.Name }, { code: validated.Code }],
          },
        });

        if (existing) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message: `Brand with name "${validated.Name}" or code "${validated.Code}" already exists.`,
          });
          continue;
        }

        // Create brand
        await prisma.brand.create({
          data: {
            tenantId,
            name: validated.Name,
            code: validated.Code,
            description: validated.Description || null,
            createdBy: actorUserId,
          },
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: error.message || 'Validation error',
        });
      }
    }

    // Log bulk upload action
    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.brand.bulk_upload',
      resource: 'brands',
      afterJson: { summary: result },
      ip: ipAddress,
      userAgent: userAgent,
    });

    return result;
  }

  async bulkUploadCategories(
    tenantId: string,
    fileBuffer: Buffer,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkUploadResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const result: BulkUploadResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const validated = bulkUploadCategoryRowSchema.parse(row);

        const existing = await prisma.category.findFirst({
          where: {
            tenantId,
            OR: [{ name: validated.Name }, { code: validated.Code }],
          },
        });

        if (existing) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message: `Category with name "${validated.Name}" or code "${validated.Code}" already exists.`,
          });
          continue;
        }

        await prisma.category.create({
          data: {
            tenantId,
            name: validated.Name,
            code: validated.Code,
            description: validated.Description || null,
            createdBy: actorUserId,
          },
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: error.message || 'Validation error',
        });
      }
    }

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.category.bulk_upload',
      resource: 'categories',
      afterJson: { summary: result },
      ip: ipAddress,
      userAgent: userAgent,
    });

    return result;
  }

  async bulkUploadProducts(
    tenantId: string,
    fileBuffer: Buffer,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkUploadResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const result: BulkUploadResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        const validated = bulkUploadProductRowSchema.parse(row);

        // Find brand and category by code
        const brand = await prisma.brand.findFirst({
          where: { tenantId, code: validated['Brand Code'] },
        });
        if (!brand) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            field: 'Brand Code',
            message: `Brand with code "${validated['Brand Code']}" not found.`,
          });
          continue;
        }

        const category = await prisma.category.findFirst({
          where: { tenantId, code: validated['Category Code'] },
        });
        if (!category) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            field: 'Category Code',
            message: `Category with code "${validated['Category Code']}" not found.`,
          });
          continue;
        }

        // Check for duplicates
        const existing = await prisma.product.findFirst({
          where: {
            tenantId,
            OR: [{ name: validated.Name }, { code: validated.Code }],
          },
        });

        if (existing) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message: `Product with name "${validated.Name}" or code "${validated.Code}" already exists.`,
          });
          continue;
        }

        await prisma.product.create({
          data: {
            tenantId,
            name: validated.Name,
            code: validated.Code,
            description: validated.Description || null,
            brandId: brand.id,
            categoryId: category.id,
            price: validated.Price,
            createdBy: actorUserId,
          },
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: error.message || 'Validation error',
        });
      }
    }

    await auditService.logAction({
      actorUserId,
      tenantId,
      action: 'master_data.product.bulk_upload',
      resource: 'products',
      afterJson: { summary: result },
      ip: ipAddress,
      userAgent: userAgent,
    });

    return result;
  }

  // ============================================
  // Export
  // ============================================

  async exportBrands(tenantId: string): Promise<Buffer> {
    const brands = await prisma.brand.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const data = brands.map((brand) => ({
      Name: brand.name,
      Code: brand.code,
      Description: brand.description || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Brands');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportCategories(tenantId: string): Promise<Buffer> {
    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const data = categories.map((category) => ({
      Name: category.name,
      Code: category.code,
      Description: category.description || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportProducts(tenantId: string): Promise<Buffer> {
    const products = await prisma.product.findMany({
      where: { tenantId },
      include: { brand: true, category: true },
      orderBy: { name: 'asc' },
    });

    const data = products.map((product) => ({
      Name: product.name,
      Code: product.code,
      Description: product.description || '',
      'Brand Code': product.brand.code,
      'Category Code': product.category.code,
      Price: product.price ? product.price.toString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // ============================================
  // Template Generation
  // ============================================

  generateBrandTemplate(): Buffer {
    const headers = ['Name', 'Code', 'Description'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Brands');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  generateCategoryTemplate(): Buffer {
    const headers = ['Name', 'Code', 'Description'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  generateProductTemplate(): Buffer {
    const headers = ['Name', 'Code', 'Description', 'Brand Code', 'Category Code', 'Price'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const masterDataService = new MasterDataService();

