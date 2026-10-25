import {
  CreateExtractionMethodSchema,
  UpdateExtractionMethodSchema,
} from '../../Models/ExtractionMethods/extraction-method.dto';
import { z } from 'zod';

export const EXTRACTION_METHOD_REPOSITORY = Symbol('EXTRACTION_METHOD_REPOSITORY');

export type CreateExtractionMethodInput = z.infer<
  typeof CreateExtractionMethodSchema
>;
export type UpdateExtractionMethodInput = z.infer<
  typeof UpdateExtractionMethodSchema
>;

export interface ExtractionMethodRecord {
  id: string;
  name: string;
  type: string;
  target: string | null;
  connection: Record<string, unknown>;
  hasCredentials: boolean | number;
  discovery: Record<string, unknown> | null;
  availableData: unknown[] | null;
  capabilities: string[] | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionMethodRepository {
  list(companyGuid: string): Promise<ExtractionMethodRecord[]>;
  findById(companyGuid: string, id: string): Promise<ExtractionMethodRecord | null>;
  create(companyGuid: string, input: CreateExtractionMethodInput): Promise<ExtractionMethodRecord>;
  update(companyGuid: string, id: string, input: UpdateExtractionMethodInput): Promise<ExtractionMethodRecord | null>;
  delete(companyGuid: string, id: string): Promise<boolean>;
}