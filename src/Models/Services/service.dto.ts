import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const jsonObject = z.record(z.string(), z.unknown());
const secretKey = /password|secret|token|community|string|private.?key|client.?secret/i;

function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).some(([key, child]) => secretKey.test(key) || containsSecretKey(child));
}

const safeJsonObject = jsonObject.refine(
  (value) => !containsSecretKey(value),
  'No se permiten secretos en la configuración; utilice referencias de vault.',
);

export const CreateServiceSchema = z.object({
  serviceTypeId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();

export const UpdateServiceSchema = CreateServiceSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
);

export const ServiceFiltersSchema = z.object({
  search: z.string().trim().max(150).optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.boolean()).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

export const ServiceStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const DuplicateServiceSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
}).strict();

export const ServiceConnectionSchema = z.object({
  connectionConfig: safeJsonObject.default({}),
  authTypeId: z.coerce.number().int().positive(),
  authConfig: safeJsonObject.default({}),
  authAlgorithm: z.string().max(80).nullable().optional(),
  encryptionAlgorithm: z.string().max(80).nullable().optional(),
  additionalParameters: safeJsonObject.default({}),
}).strict();

export const ServiceCredentialSchema = z.object({
  credentialType: z.string().trim().min(1).max(50),
  credentialReference: z.string().trim().max(500).regex(/^(vault|secret):\/\//),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict();

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type ServiceFilters = z.infer<typeof ServiceFiltersSchema>;
export type ServiceConnectionInput = z.infer<typeof ServiceConnectionSchema>;
export type ServiceCredentialInput = z.infer<typeof ServiceCredentialSchema>;

export class CreateServiceDto {
  @ApiProperty() serviceTypeId!: number;
  @ApiProperty({ maxLength: 100 }) code!: string;
  @ApiProperty({ maxLength: 150 }) name!: string;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true }) description?: string | null;
  @ApiPropertyOptional({ default: true }) isActive?: boolean;
}

export class UpdateServiceDto {
  @ApiPropertyOptional() serviceTypeId?: number;
  @ApiPropertyOptional({ maxLength: 100 }) code?: string;
  @ApiPropertyOptional({ maxLength: 150 }) name?: string;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true }) description?: string | null;
  @ApiPropertyOptional() isActive?: boolean;
}

export class ServiceStatusDto {
  @ApiProperty() isActive!: boolean;
}

export class DuplicateServiceDto {
  @ApiProperty({ maxLength: 100 }) code!: string;
  @ApiProperty({ maxLength: 150 }) name!: string;
}

export class ServiceConnectionDto {
  @ApiProperty({ type: 'object', additionalProperties: true }) connectionConfig!: Record<string, unknown>;
  @ApiProperty() authTypeId!: number;
  @ApiProperty({ type: 'object', additionalProperties: true }) authConfig!: Record<string, unknown>;
  @ApiPropertyOptional({ maxLength: 80 }) authAlgorithm?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) encryptionAlgorithm?: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) additionalParameters!: Record<string, unknown>;
}

export class ServiceCredentialDto {
  @ApiProperty({ maxLength: 50 }) credentialType!: string;
  @ApiProperty({ maxLength: 500, pattern: '^(vault|secret)://' }) credentialReference!: string;
  @ApiPropertyOptional({ nullable: true }) expiresAt?: Date | null;
}

export class ServiceResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() serviceTypeId!: number;
  @ApiProperty() serviceTypeCode!: string;
  @ApiProperty() driverKey!: string;
  @ApiProperty() driverStatus!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) connectionConfig?: Record<string, unknown>;
  @ApiPropertyOptional() authTypeCode?: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
