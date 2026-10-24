import {
  CreateCompanySchema,
  UpdateCompanySchema,
} from '../../Models/Company/company.dto';
import { z } from 'zod';

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

export interface CompanyRecord {
  guid: string;
  name: string;
  shortName: string;
  code: string;
  databaseName?: string | null;
  timezone: string;
  locale: string;
  status: 'ACTIVE' | 'INACTIVE';
  configJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyRepository {
  list(): Promise<CompanyRecord[]>;
  findByGuid(guid: string): Promise<CompanyRecord | null>;
  create(input: CreateCompanyInput): Promise<CompanyRecord>;
  update(guid: string, input: UpdateCompanyInput): Promise<CompanyRecord | null>;
  delete(guid: string): Promise<boolean>;
  createDatabase(guid: string): Promise<CompanyDatabaseCreation | null>;
}

export interface CompanyDatabaseCreation {
  companyGuid: string;
  databaseName: string;
  created: boolean | number;
}
