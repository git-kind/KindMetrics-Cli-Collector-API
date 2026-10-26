import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export {
  CreateConnectorSchema,
  CreateProviderSchema,
  ExtractionCatalogFiltersSchema,
  UpdateConnectorSchema,
  UpdateProviderSchema,
} from '../../Repositories/Contracts/extraction-catalog.repository';

export class CreateExtractionProviderDto {
  @ApiProperty({ maxLength: 80 })
  code!: string;

  @ApiProperty({ maxLength: 150 })
  name!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;
}

export class UpdateExtractionProviderDto {
  @ApiPropertyOptional({ maxLength: 80 })
  code?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  name?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  description?: string | null;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class CreateExtractionConnectorDto {
  @ApiProperty()
  providerId!: number;

  @ApiProperty({ maxLength: 100 })
  connectorKey!: string;

  @ApiProperty({ maxLength: 150 })
  name!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  driverKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  driverVersion?: string | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  configurationSchema?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  capabilities?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;
}

export class UpdateExtractionConnectorDto {
  @ApiPropertyOptional()
  providerId?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  connectorKey?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  name?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  driverKey?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  driverVersion?: string | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  configurationSchema?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  capabilities?: Record<string, unknown>;

  @ApiPropertyOptional()
  isActive?: boolean;
}