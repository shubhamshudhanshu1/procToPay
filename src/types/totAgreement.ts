import { TotAgreementStatus, TotTemplateType } from '@prisma/client';

export interface TotAgreement {
  id: string;
  tenantId: string;
  name: string;
  brandId: string;
  templateId: string;
  type: TotTemplateType;
  status: TotAgreementStatus;
  startDate: Date;
  endDate: Date;
  parameters: Record<string, any>;
  createdBy: string;
  approvedBy?: string | null;
  rejectedBy?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  brand?: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  template?: {
    id: string;
    name: string;
    type: TotTemplateType;
    description?: string | null;
    parameters?: Array<{
      id: string;
      name: string;
      label?: string | null;
      type: string;
      required: boolean;
      defaultValue?: string | null;
    }>;
  };
  categories?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  creator?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  approver?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  rejector?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface CreateTotAgreementInput {
  name: string;
  brandId: string;
  templateId: string;
  startDate: Date;
  endDate: Date;
  categoryIds: string[];
  parameters: Record<string, any>;
  status?: TotAgreementStatus;
}

export interface UpdateTotAgreementInput extends Partial<CreateTotAgreementInput> {}

export interface QueryTotAgreementsInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: TotAgreementStatus;
  brandId?: string;
  templateId?: string;
}

export interface ApproveTotAgreementInput {
  // Empty for now, can add approval notes later
}

export interface RejectTotAgreementInput {
  reason: string;
}

