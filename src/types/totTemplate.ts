export type TotTemplateStatus = 'draft' | 'active' | 'archived';
export type TotTemplateType = 'VOLUME_BASED' | 'SEASONAL' | 'LAUNCH_SUPPORT' | 'CLEARANCE';
export type TotTemplateParameterType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'currency'
  | 'percentage';

export interface TemplateParameter {
  name: string;
  type: TotTemplateParameterType;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  order?: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  type: TotTemplateType;
  content: string;
  parameters?: TemplateParameter[];
  status?: TotTemplateStatus;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  type?: TotTemplateType;
  content?: string;
  parameters?: TemplateParameter[];
  status?: TotTemplateStatus;
}

export interface QueryTemplatesInput {
  search?: string;
  type?: TotTemplateType;
  status?: TotTemplateStatus;
  page?: number;
  limit?: number;
}

export interface DuplicateTemplateInput {
  name: string;
  version?: string;
}

