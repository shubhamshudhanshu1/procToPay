import { prisma } from '../db/prisma';
import { auditService } from './auditService';
import {
  CreateTotAgreementInput,
  UpdateTotAgreementInput,
  QueryTotAgreementsInput,
} from '../types/totAgreement';
import { TotAgreementStatus } from '@prisma/client';

class TotAgreementService {
  /**
   * Get agreements with filtering, searching, and pagination
   */
  async getAgreements(tenantId: string, query: QueryTotAgreementsInput) {
    const { search, status, brandId, templateId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) where.status = status;
    if (brandId) where.brandId = brandId;
    if (templateId) where.templateId = templateId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          brand: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [agreements, total] = await Promise.all([
      prisma.totAgreement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          brand: {
            select: { id: true, name: true, code: true, description: true },
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
            },
          },
          categories: {
            include: {
              category: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.totAgreement.count({ where }),
    ]);

    // Transform categories for easier frontend consumption
    const transformedAgreements = agreements.map((agreement) => ({
      ...agreement,
      categories: agreement.categories.map((ac) => ac.category),
      categoryCount: agreement.categories.length,
    }));

    return {
      agreements: transformedAgreements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single agreement by ID
   */
  async getAgreementById(tenantId: string, agreementId: string) {
    const agreement = await prisma.totAgreement.findFirst({
      where: {
        id: agreementId,
        tenantId, // Ensure tenant isolation
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true, description: true },
        },
        template: {
          include: {
            parameters: {
              orderBy: { order: 'asc' },
            },
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        rejector: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Transform categories
    return {
      ...agreement,
      categories: agreement.categories.map((ac) => ac.category),
    };
  }

  /**
   * Create new agreement
   */
  async createAgreement(
    tenantId: string,
    data: CreateTotAgreementInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate brand exists
    const brand = await prisma.brand.findFirst({
      where: { id: data.brandId, tenantId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Validate template exists and get its type
    const template = await prisma.totTemplate.findFirst({
      where: { id: data.templateId, tenantId },
      include: {
        parameters: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate categories exist
    if (data.categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          id: { in: data.categoryIds },
          tenantId,
        },
      });
      if (categories.length !== data.categoryIds.length) {
        throw new Error('One or more categories not found');
      }
    }

    // Validate parameters against template parameters
    const templateParams = template.parameters || [];
    for (const param of templateParams) {
      if (param.required && !(param.name in data.parameters)) {
        throw new Error(`Required parameter "${param.label || param.name}" is missing`);
      }
    }

    // Create agreement
    const agreement = await prisma.totAgreement.create({
      data: {
        tenantId,
        name: data.name,
        brandId: data.brandId,
        templateId: data.templateId,
        type: template.type, // Inherit type from template
        status: data.status || 'draft',
        startDate: data.startDate,
        endDate: data.endDate,
        parameters: data.parameters,
        createdBy: userId,
        categories: {
          create: data.categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true, description: true },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_agreement.create',
      resource: `tot_agreement:${agreement.id}`,
      afterJson: agreement,
      ip: ipAddress,
      userAgent: userAgent,
    });

    // Transform categories
    return {
      ...agreement,
      categories: agreement.categories.map((ac) => ac.category),
    };
  }

  /**
   * Update agreement
   */
  async updateAgreement(
    tenantId: string,
    agreementId: string,
    data: UpdateTotAgreementInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get existing agreement
    const existing = await prisma.totAgreement.findFirst({
      where: { id: agreementId, tenantId },
    });
    if (!existing) {
      throw new Error('Agreement not found');
    }

    // Can only edit draft agreements
    if (existing.status !== 'draft') {
      throw new Error('Only draft agreements can be edited');
    }

    // Validate brand if provided
    if (data.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: data.brandId, tenantId },
      });
      if (!brand) {
        throw new Error('Brand not found');
      }
    }

    // Validate template if provided
    let templateType = existing.type;
    if (data.templateId) {
      const template = await prisma.totTemplate.findFirst({
        where: { id: data.templateId, tenantId },
        include: {
          parameters: {
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!template) {
        throw new Error('Template not found');
      }
      templateType = template.type;

      // Validate parameters if template changed
      if (data.parameters) {
        for (const param of template.parameters) {
          if (param.required && !(param.name in data.parameters)) {
            throw new Error(`Required parameter "${param.label || param.name}" is missing`);
          }
        }
      }
    }

    // Validate categories if provided
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          id: { in: data.categoryIds },
          tenantId,
        },
      });
      if (categories.length !== data.categoryIds.length) {
        throw new Error('One or more categories not found');
      }
    }

    // Update agreement
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.brandId) updateData.brandId = data.brandId;
    if (data.templateId) {
      updateData.templateId = data.templateId;
      updateData.type = templateType;
    }
    if (data.startDate) updateData.startDate = data.startDate;
    if (data.endDate) updateData.endDate = data.endDate;
    if (data.parameters) updateData.parameters = data.parameters;
    if (data.status) updateData.status = data.status;

    const agreement = await prisma.totAgreement.update({
      where: { id: agreementId },
      data: updateData,
      include: {
        brand: {
          select: { id: true, name: true, code: true, description: true },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    // Update categories if provided
    if (data.categoryIds) {
      // Delete existing categories
      await prisma.totAgreementCategory.deleteMany({
        where: { agreementId },
      });

      // Create new categories
      await prisma.totAgreementCategory.createMany({
        data: data.categoryIds.map((categoryId) => ({
          agreementId,
          categoryId,
        })),
      });

      // Reload with updated categories
      const updated = await prisma.totAgreement.findFirst({
        where: { id: agreementId },
        include: {
          categories: {
            include: {
              category: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      });

      if (updated) {
        return {
          ...agreement,
          categories: updated.categories.map((ac) => ac.category),
        };
      }
    }

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_agreement.update',
      resource: `tot_agreement:${agreement.id}`,
      beforeJson: existing,
      afterJson: agreement,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return {
      ...agreement,
      categories: agreement.categories.map((ac) => ac.category),
    };
  }

  /**
   * Delete agreement
   */
  async deleteAgreement(
    tenantId: string,
    agreementId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const agreement = await prisma.totAgreement.findFirst({
      where: { id: agreementId, tenantId },
    });
    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Can only delete draft or rejected agreements
    if (!['draft', 'rejected'].includes(agreement.status)) {
      throw new Error('Only draft or rejected agreements can be deleted');
    }

    await prisma.totAgreement.delete({
      where: { id: agreementId },
    });

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_agreement.delete',
      resource: `tot_agreement:${agreement.id}`,
      beforeJson: agreement,
      ip: ipAddress,
      userAgent: userAgent,
    });
  }

  /**
   * Approve agreement
   */
  async approveAgreement(
    tenantId: string,
    agreementId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const agreement = await prisma.totAgreement.findFirst({
      where: { id: agreementId, tenantId },
    });
    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.status !== 'pending_approval') {
      throw new Error('Only pending approval agreements can be approved');
    }

    const updated = await prisma.totAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true, description: true },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_agreement.approve',
      resource: `tot_agreement:${agreement.id}`,
      beforeJson: agreement,
      afterJson: updated,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return {
      ...updated,
      categories: updated.categories.map((ac) => ac.category),
    };
  }

  /**
   * Reject agreement
   */
  async rejectAgreement(
    tenantId: string,
    agreementId: string,
    userId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const agreement = await prisma.totAgreement.findFirst({
      where: { id: agreementId, tenantId },
    });
    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.status !== 'pending_approval') {
      throw new Error('Only pending approval agreements can be rejected');
    }

    const updated = await prisma.totAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true, description: true },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_agreement.reject',
      resource: `tot_agreement:${agreement.id}`,
      beforeJson: agreement,
      afterJson: updated,
      ip: ipAddress,
      userAgent: userAgent,
    });

    return {
      ...updated,
      categories: updated.categories.map((ac) => ac.category),
    };
  }

  /**
   * Update agreement status based on dates (background job)
   * Called periodically to update approved -> active and active -> expired
   */
  async updateStatusBasedOnDates() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Update approved agreements to active if start date has passed
    await prisma.totAgreement.updateMany({
      where: {
        status: 'approved',
        startDate: { lte: today },
      },
      data: {
        status: 'active',
      },
    });

    // Update active agreements to expired if end date has passed
    await prisma.totAgreement.updateMany({
      where: {
        status: 'active',
        endDate: { lt: today },
      },
      data: {
        status: 'expired',
      },
    });
  }
}

export const totAgreementService = new TotAgreementService();

