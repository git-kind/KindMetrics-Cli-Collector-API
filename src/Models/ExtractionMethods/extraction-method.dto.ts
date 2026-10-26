import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const jsonObject = z.record(z.string(), z.unknown());

export const ExtractionMethodParameterSchema = z.object({
  parameterKey: z.string().trim().min(1).max(100),
  dataType: z.string().trim().min(1).max(30),
  defaultValue: z.string().nullable().optional(),
  isRequired: z.boolean().default(false),
  isSecret: z.boolean().default(false),
  description: z.string().max(500).nullable().optional(),
});

export const ExtractionMethodFieldSchema = z.object({
  fieldKey: z.string().trim().min(1).max(100),
  sourcePath: z.string().trim().min(1).max(500),
  dataType: z.string().trim().min(1).max(30),
  unit: z.string().max(30).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const ExtractionMethodRequestSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  requestType: z.string().trim().min(1).max(30),
  requestConfig: jsonObject,
  isActive: z.boolean().default(true),
  fields: z.array(ExtractionMethodFieldSchema).default([]),
});

export const EquipmentExtractionMethodSchema = z.object({
  equipmentId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  connectionConfig: jsonObject.nullable().optional(),
  credentialRef: z.string().max(255).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const CreateExtractionMethodSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  description: z.string().nullable().optional(),
  protocol: z.string().trim().min(1).max(30),
  configurationSchema: jsonObject.nullable().optional(),
  isActive: z.boolean().default(true),
  parameters: z.array(ExtractionMethodParameterSchema).default([]),
  requests: z.array(ExtractionMethodRequestSchema).default([]),
  equipment: z.array(EquipmentExtractionMethodSchema).default([]),
});

export const UpdateExtractionMethodSchema = z
  .object({
    code: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().nullable().optional(),
    protocol: z.string().trim().min(1).max(30).optional(),
    configurationSchema: jsonObject.nullable().optional(),
    isActive: z.boolean().optional(),
    parameters: z.array(ExtractionMethodParameterSchema).optional(),
    requests: z.array(ExtractionMethodRequestSchema).optional(),
    equipment: z.array(EquipmentExtractionMethodSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export class CreateExtractionMethodDto {
  @ApiProperty({ maxLength: 100 })
  code!: string;

  @ApiProperty({ maxLength: 150 })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ maxLength: 30, example: 'SNMP' })
  protocol!: string;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  configurationSchema?: Record<string, unknown> | null;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;

  @ApiProperty({ type: [Object] })
  parameters!: z.infer<typeof ExtractionMethodParameterSchema>[];

  @ApiProperty({ type: [Object] })
  requests!: z.infer<typeof ExtractionMethodRequestSchema>[];

  @ApiProperty({ type: [Object] })
  equipment!: z.infer<typeof EquipmentExtractionMethodSchema>[];
}

export class UpdateExtractionMethodDto {
  @ApiPropertyOptional({ maxLength: 100 })
  code?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 30 })
  protocol?: string;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  configurationSchema?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [Object] })
  parameters?: z.infer<typeof ExtractionMethodParameterSchema>[];

  @ApiPropertyOptional({ type: [Object] })
  requests?: z.infer<typeof ExtractionMethodRequestSchema>[];

  @ApiPropertyOptional({ type: [Object] })
  equipment?: z.infer<typeof EquipmentExtractionMethodSchema>[];
}

export class ExtractionMethodResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  protocol!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  configurationSchema!: Record<string, unknown> | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [Object] })
  parameters!: unknown[];

  @ApiProperty({ type: [Object] })
  requests!: unknown[];

  @ApiProperty({ type: [Object] })
  equipment!: unknown[];

  @ApiProperty({ type: [Object] })
  versions!: unknown[];


  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}