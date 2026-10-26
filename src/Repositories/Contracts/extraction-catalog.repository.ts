import { z } from 'zod';

export const EXTRACTION_CATALOG_REPOSITORY = Symbol('EXTRACTION_CATALOG_REPOSITORY');

export const ExtractionCatalogFiltersSchema = z.object({
  search: z.string().trim().max(150).optional(),
  providerId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.boolean()).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const CreateProviderSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();

export const UpdateProviderSchema = CreateProviderSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
);

export const CreateConnectorSchema = z.object({
  providerId: z.number().int().positive(),
  connectorKey: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(500).nullable().optional(),
  driverKey: z.string().trim().max(100).nullable().optional(),
  driverVersion: z.string().trim().max(40).nullable().optional(),
  configurationSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  capabilities: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
}).strict();

export const UpdateConnectorSchema = CreateConnectorSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
);

export type ExtractionCatalogFilters = z.infer<typeof ExtractionCatalogFiltersSchema>;
export type CreateProviderInput = z.infer<typeof CreateProviderSchema>;
export type UpdateProviderInput = z.infer<typeof UpdateProviderSchema>;
export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>;
export type UpdateConnectorInput = z.infer<typeof UpdateConnectorSchema>;

export interface ExtractionCatalogRepository {
  listProviders(filters: ExtractionCatalogFilters): Promise<Record<string, unknown>[]>;
  getProvider(id: number): Promise<Record<string, unknown> | null>;
  createProvider(input: CreateProviderInput): Promise<Record<string, unknown>>;
  updateProvider(id: number, input: UpdateProviderInput): Promise<Record<string, unknown> | null>;
  deleteProvider(id: number): Promise<boolean>;
  listConnectors(filters: ExtractionCatalogFilters): Promise<Record<string, unknown>[]>;
  getConnector(id: number): Promise<Record<string, unknown> | null>;
  createConnector(input: CreateConnectorInput): Promise<Record<string, unknown>>;
  updateConnector(id: number, input: UpdateConnectorInput): Promise<Record<string, unknown> | null>;
  deleteConnector(id: number): Promise<boolean>;
}