import { z } from 'zod';
import { TotAgreementStatus } from '@prisma/client';

export const createTotAgreementSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(500, 'Name is too long'),
    brandId: z.string().uuid('Invalid brand ID'),
    templateId: z.string().uuid('Invalid template ID'),
    startDate: z.coerce.date({
      required_error: 'Start date is required',
      invalid_type_error: 'Invalid start date',
    }),
    endDate: z.coerce.date({
      required_error: 'End date is required',
      invalid_type_error: 'Invalid end date',
    }),
    categoryIds: z.array(z.string().uuid('Invalid category ID')).min(1, 'At least one category is required'),
    parameters: z.record(z.any()).default({}),
    status: z.nativeEnum(TotAgreementStatus).optional().default('draft'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  });

export const updateTotAgreementSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(500, 'Name is too long').optional(),
    brandId: z.string().uuid('Invalid brand ID').optional(),
    templateId: z.string().uuid('Invalid template ID').optional(),
    startDate: z.coerce.date({
      invalid_type_error: 'Invalid start date',
    }).optional(),
    endDate: z.coerce.date({
      invalid_type_error: 'Invalid end date',
    }).optional(),
    categoryIds: z.array(z.string().uuid('Invalid category ID')).optional(),
    parameters: z.record(z.any()).optional(),
    status: z.nativeEnum(TotAgreementStatus).optional(),
  })
  .refine(
    (data) => {
      // Only validate date relationship if both dates are provided
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  );

export const queryTotAgreementsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.nativeEnum(TotAgreementStatus).optional(),
  brandId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
});

export const approveTotAgreementSchema = z.object({});

export const rejectTotAgreementSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(1000, 'Reason is too long'),
});

export type CreateTotAgreementInput = z.infer<typeof createTotAgreementSchema>;
export type UpdateTotAgreementInput = z.infer<typeof updateTotAgreementSchema>;
export type QueryTotAgreementsInput = z.infer<typeof queryTotAgreementsSchema>;
export type ApproveTotAgreementInput = z.infer<typeof approveTotAgreementSchema>;
export type RejectTotAgreementInput = z.infer<typeof rejectTotAgreementSchema>;

