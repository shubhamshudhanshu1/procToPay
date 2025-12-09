import { z } from 'zod';

// Match Prisma enums
export const totTemplateStatusEnum = z.enum(['draft', 'active', 'archived']);
export const totTemplateTypeEnum = z.enum([
  'VOLUME_BASED',
  'SEASONAL',
  'LAUNCH_SUPPORT',
  'CLEARANCE',
]);
export const parameterTypeEnum = z.enum([
  'text',
  'number',
  'date',
  'boolean',
  'currency',
  'percentage',
]);

export const versionSchema = z.string().regex(/^v\d+\.\d+$/, {
  message: 'Version must be in format v1.0, v2.0, etc.',
});

export const createParameterSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
      message:
        'Parameter name must start with a letter and contain only alphanumeric characters and underscores',
    }),
  type: parameterTypeEnum,
  label: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: totTemplateTypeEnum,
  content: z.string().min(1),
  parameters: z.array(createParameterSchema).default([]),
  status: totTemplateStatusEnum.default('draft'),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  type: totTemplateTypeEnum.optional(),
  content: z.string().min(1).optional(),
  parameters: z.array(createParameterSchema).optional(),
  status: totTemplateStatusEnum.optional(),
});

export const queryTemplatesSchema = z.object({
  search: z.string().optional(),
  type: totTemplateTypeEnum.optional(),
  status: totTemplateStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const duplicateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  version: versionSchema.optional(),
});

