export type MasterDataType = 'brand' | 'category' | 'product';

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  brandId: string;
  categoryId: string;
  price?: number | null;
  status: string;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand?: Brand;
  category?: Category;
  creator?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface CreateBrandInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateBrandInput {
  name?: string;
  code?: string;
  description?: string | null;
  status?: string;
}

export interface CreateCategoryInput {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  code?: string;
  description?: string | null;
  status?: string;
}

export interface CreateProductInput {
  name: string;
  code: string;
  description?: string | null;
  brandCode: string; // Reference by code for easier Excel import
  categoryCode: string; // Reference by code for easier Excel import
  price?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  code?: string;
  description?: string | null;
  brandId?: string;
  categoryId?: string;
  price?: number | null;
  status?: string;
}

export interface QueryMasterDataFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}
