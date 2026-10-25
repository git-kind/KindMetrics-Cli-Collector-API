import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const jsonObject = z.record(z.string(), z.unknown());

export const CreateExtractionMethodSchema = z.object({
  name: z.string().trim().min(1).max(150),
  type: z.string().trim().min(1).max(60),
  target: z.string().trim().max(255).nullable().optional(),
  connection: jsonObject,
  credentials: jsonObject.nullable().optional(),
  discovery: jsonObject.nullable().optional(),
  availableData: z.array(z.unknown()).nullable().optional(),
  capabilities: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const UpdateExtractionMethodSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    type: z.string().trim().min(1).max(60).optional(),
    target: z.string().trim().max(255).nullable().optional(),
    connection: jsonObject.optional(),
    credentials: jsonObject.nullable().optional(),
    discovery: jsonObject.nullable().optional(),
    availableData: z.array(z.unknown()).nullable().optional(),
    capabilities: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export class CreateExtractionMethodDto {
  @ApiProperty({ maxLength: 150 })
  name!: string;

  @ApiProperty({ maxLength: 60, example: 'SNMP' })
  type!: string;

  @ApiPropertyOptional({ nullable: true })
  target?: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  connection!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    writeOnly: true,
    additionalProperties: true,
  })
  credentials?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  discovery?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [Object], nullable: true })
  availableData?: unknown[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  capabilities?: string[] | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateExtractionMethodDto {
  @ApiPropertyOptional({ maxLength: 150 })
  name?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  type?: string;

  @ApiPropertyOptional({ nullable: true })
  target?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  connection?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    writeOnly: true,
    additionalProperties: true,
  })
  credentials?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  discovery?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [Object], nullable: true })
  availableData?: unknown[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  capabilities?: string[] | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  status?: 'ACTIVE' | 'INACTIVE';
}

export class ExtractionMethodResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ nullable: true })
  target!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  connection!: Record<string, unknown>;

  @ApiProperty({ description: 'Indica si existen credenciales guardadas.' })
  hasCredentials!: boolean;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  discovery!: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [Object], nullable: true })
  availableData!: unknown[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  capabilities!: string[] | null;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: 'ACTIVE' | 'INACTIVE';

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}