import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateExtractionConnectorDto,
  CreateExtractionProviderDto,
  CreateConnectorSchema,
  CreateProviderSchema,
  ExtractionCatalogFiltersSchema,
  UpdateConnectorSchema,
  UpdateExtractionConnectorDto,
  UpdateExtractionProviderDto,
  UpdateProviderSchema,
} from '../../Models/ExtractionMethods/extraction-catalog.dto';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ExtractionCatalogService } from '../../Services/ExtractionMethods/extraction-catalog.service';

@ApiTags('Extraction Catalog')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller()
export class ExtractionCatalogController {
  constructor(private readonly catalog: ExtractionCatalogService) {}

  @Get('extraction-providers')
  @ApiOperation({ summary: 'Listar proveedores de extracción' })
  @ApiResponse({ status: 200 })
  listProviders(@Query() query: unknown) {
    return this.catalog.listProviders(this.parse(ExtractionCatalogFiltersSchema, query));
  }

  @Get('extraction-providers/:id')
  getProvider(@Param('id', ParseIntPipe) id: number) { return this.catalog.getProvider(id); }

  @Post('extraction-providers')
  @ApiBody({ type: CreateExtractionProviderDto })
  createProvider(@Body() body: unknown) {
    return this.catalog.createProvider(this.parse(CreateProviderSchema, body));
  }

  @Patch('extraction-providers/:id')
  @ApiBody({ type: UpdateExtractionProviderDto })
  updateProvider(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.catalog.updateProvider(id, this.parse(UpdateProviderSchema, body));
  }

  @Delete('extraction-providers/:id')
  deleteProvider(@Param('id', ParseIntPipe) id: number) { return this.catalog.deleteProvider(id); }

  @Get('extraction-connectors')
  @ApiOperation({ summary: 'Listar conectores registrados' })
  @ApiResponse({ status: 200 })
  listConnectors(@Query() query: unknown) {
    return this.catalog.listConnectors(this.parse(ExtractionCatalogFiltersSchema, query));
  }

  @Get('extraction-connectors/:id')
  getConnector(@Param('id', ParseIntPipe) id: number) { return this.catalog.getConnector(id); }

  @Post('extraction-connectors')
  @ApiBody({ type: CreateExtractionConnectorDto })
  createConnector(@Body() body: unknown) {
    return this.catalog.createConnector(this.parse(CreateConnectorSchema, body));
  }

  @Patch('extraction-connectors/:id')
  @ApiBody({ type: UpdateExtractionConnectorDto })
  updateConnector(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.catalog.updateConnector(id, this.parse(UpdateConnectorSchema, body));
  }

  @Delete('extraction-connectors/:id')
  deleteConnector(@Param('id', ParseIntPipe) id: number) { return this.catalog.deleteConnector(id); }

  private parse<TSchema extends { safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: { issues: Array<{ message: string }> } } }>(schema: TSchema, value: unknown) {
    const result = schema.safeParse(value);
    if (!result.success) throw new BadRequestException(result.error.issues.map((issue) => issue.message));
    return result.data as TSchema extends { safeParse(value: unknown): { success: true; data: infer TData } } ? TData : never;
  }
}