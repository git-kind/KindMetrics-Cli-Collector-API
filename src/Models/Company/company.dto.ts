import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const configSchema = z.record(z.string(), z.unknown()).nullable();

export const CreateCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  shortName: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(60),
  timezone: z.string().trim().min(1).max(64).default('UTC'),
  locale: z.string().trim().min(2).max(10).default('es'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  configJson: configSchema.optional(),
});

export const UpdateCompanySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    shortName: z.string().trim().min(1).max(80).optional(),
    code: z.string().trim().min(1).max(60).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    configJson: configSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export class CreateCompanyDto {
  @ApiProperty({ maxLength: 200 })
  name!: string;

  @ApiProperty({ maxLength: 80 })
  shortName!: string;

  @ApiProperty({ maxLength: 60 })
  code!: string;

  @ApiProperty({ default: 'UTC' })
  timezone!: string;

  @ApiProperty({ default: 'es' })
  locale!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status!: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  configJson?: Record<string, unknown> | null;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ maxLength: 200 })
  name?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  shortName?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  code?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  timezone?: string;

  @ApiPropertyOptional({ maxLength: 10 })
  locale?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  configJson?: Record<string, unknown> | null;
}

export class CompanyResponseDto {
  @ApiProperty({ format: 'uuid' })
  guid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  shortName!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ nullable: true, example: 'km_company_abc123' })
  databaseName?: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  locale!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  configJson!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CompanyDatabaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  companyGuid!: string;

  @ApiProperty({ example: 'km_company_0123456789abcdef0123456789abcdef' })
  databaseName!: string;

  @ApiProperty({ description: 'Indica si la base se creó en esta solicitud.' })
  created!: boolean;
}