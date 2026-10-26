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
  id: number;
  code: string;
  name: string;
  description: string | null;
  protocol: string;
  configurationSchema: Record<string, unknown> | null;
  isActive: boolean | number;
  parameters: Array<Record<string, unknown>>;
  requests: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  versions: Array<Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionMethodRepository {
  list(companyGuid: string): Promise<ExtractionMethodRecord[]>;
  findById(companyGuid: string, id: number): Promise<ExtractionMethodRecord | null>;
  create(companyGuid: string, input: CreateExtractionMethodInput): Promise<ExtractionMethodRecord>;
  update(companyGuid: string, id: number, input: UpdateExtractionMethodInput): Promise<ExtractionMethodRecord | null>;
  delete(companyGuid: string, id: number): Promise<boolean>;
}