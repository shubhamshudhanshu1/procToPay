import { prisma } from '../db/prisma';
import { auditService } from './auditService';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  QueryTemplatesInput,
  DuplicateTemplateInput,
} from '../types/totTemplate';

class TotTemplateService {
  /**
   * Get templates with filtering, searching, and pagination
   */
  async getTemplates(tenantId: string, query: QueryTemplatesInput) {
    const { search, type, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.totTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          parameters: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      prisma.totTemplate.count({ where }),
    ]);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single template by ID
   */
  async getTemplateById(tenantId: string, templateId: string) {
    const template = await prisma.totTemplate.findFirst({
      where: {
        id: templateId,
        tenantId, // Ensure tenant isolation
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updater: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parameters: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }

  /**
   * Create new template
   */
  async createTemplate(
    tenantId: string,
    data: CreateTemplateInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate parameter names are unique
    const paramNames = data.parameters?.map((p) => p.name) || [];
    if (new Set(paramNames).size !== paramNames.length) {
      throw new Error('Parameter names must be unique');
    }

    // Create template with parameters
    const template = await prisma.totTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: data.type,
        content: data.content,
        status: data.status || 'draft',
        version: 'v1.0',
        createdBy: userId,
        parameters: {
          create: (data.parameters || []).map((param, index) => ({
            name: param.name,
            type: param.type,
            label: param.label,
            description: param.description,
            required: param.required ?? false,
            defaultValue: param.defaultValue,
            order: param.order ?? index,
          })),
        },
      },
      include: {
        parameters: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create initial version snapshot
    await this.createVersionSnapshot(template.id, userId, 'Initial version');

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_template.create',
      resource: `tot_template:${template.id}`,
      afterJson: template,
      ip: ipAddress,
      userAgent,
    });

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(
    tenantId: string,
    templateId: string,
    data: UpdateTemplateInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get existing template
    const existing = await this.getTemplateById(tenantId, templateId);

    // Determine new version
    let newVersion = existing.version;
    const isContentChange = data.content && data.content !== existing.content;
    const isParameterChange = data.parameters !== undefined;

    if (isContentChange || isParameterChange) {
      // Increment minor version for content/parameter changes
      const [major, minor] = existing.version.replace('v', '').split('.').map(Number);
      newVersion = `v${major}.${minor + 1}`;
    }

    // Update template
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (newVersion !== existing.version) {
      updateData.version = newVersion;
      updateData.updatedBy = userId;
    } else if (data.name || data.description || data.type || data.status) {
      // Metadata changes still update updatedBy
      updateData.updatedBy = userId;
    }

    // Handle parameters update
    if (data.parameters !== undefined) {
      // Delete existing parameters
      await prisma.totTemplateParameter.deleteMany({
        where: { templateId },
      });

      // Create new parameters
      updateData.parameters = {
        create: data.parameters.map((param, index) => ({
          name: param.name,
          type: param.type,
          label: param.label,
          description: param.description,
          required: param.required ?? false,
          defaultValue: param.defaultValue,
          order: param.order ?? index,
        })),
      };
    }

    const updated = await prisma.totTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        parameters: true,
        updater: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create version snapshot if content or parameters changed
    if (isContentChange || isParameterChange) {
      await this.createVersionSnapshot(templateId, userId);
    }

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_template.update',
      resource: `tot_template:${templateId}`,
      beforeJson: existing,
      afterJson: updated,
      ip: ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(
    tenantId: string,
    templateId: string,
    data: DuplicateTemplateInput,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const sourceTemplate = await this.getTemplateById(tenantId, templateId);

    // Create new template from source
    const duplicated = await prisma.totTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: sourceTemplate.description,
        type: sourceTemplate.type,
        content: sourceTemplate.content,
        status: 'draft',
        version: data.version || 'v1.0',
        createdBy: userId,
        parameters: {
          create: sourceTemplate.parameters.map((param) => ({
            name: param.name,
            type: param.type,
            label: param.label,
            description: param.description,
            required: param.required,
            defaultValue: param.defaultValue,
            order: param.order,
          })),
        },
      },
      include: {
        parameters: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create initial version snapshot
    await this.createVersionSnapshot(duplicated.id, userId, 'Duplicated from template');

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_template.duplicate',
      resource: `tot_template:${duplicated.id}`,
      afterJson: { sourceTemplateId: templateId, duplicated },
      ip: ipAddress,
      userAgent,
    });

    return duplicated;
  }

  /**
   * Get version history
   */
  async getVersionHistory(tenantId: string, templateId: string) {
    // Verify template belongs to tenant
    await this.getTemplateById(tenantId, templateId);

    return prisma.totTemplateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Create version snapshot (internal helper)
   */
  private async createVersionSnapshot(templateId: string, userId: string, changeNotes?: string) {
    const template = await prisma.totTemplate.findUnique({
      where: { id: templateId },
      include: { parameters: true },
    });

    if (!template) return;

    await prisma.totTemplateVersion.create({
      data: {
        templateId,
        version: template.version,
        content: template.content,
        parameters: template.parameters as any,
        status: template.status,
        createdBy: userId,
        changeNotes,
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(
    tenantId: string,
    templateId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const template = await this.getTemplateById(tenantId, templateId);

    await prisma.totTemplate.delete({
      where: { id: templateId },
    });

    // Audit log
    await auditService.logAction({
      actorUserId: userId,
      tenantId,
      action: 'tot_template.delete',
      resource: `tot_template:${templateId}`,
      beforeJson: template,
      ip: ipAddress,
      userAgent,
    });
  }
}

export const totTemplateService = new TotTemplateService();

