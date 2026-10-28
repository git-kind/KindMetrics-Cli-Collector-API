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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { CompanyContext } from '../../common/company-context/company-context';
import { CurrentCompany } from '../../common/company-context/company-context.decorator';
import { CompanyContextGuard } from '../../common/company-context/company-context.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ServiceRoles, ServiceRolesGuard } from '../../common/guards/service-roles.guard';
import {
  CollectorConfigurationSchema,
  CollectorExecutionFiltersSchema,
  CollectorFiltersSchema,
  CollectorRunSchema,
  CollectorRunDto,
  CollectorStatusDto,
  CreateCollectorDto,
  CreateCollectorSchema,
  DuplicateCollectorSchema,
  DuplicateCollectorDto,
  UpdateCollectorDto,
  UpdateCollectorSchema,
} from '../../Models/Collectors/collector.dto';
import { CollectorsService } from '../../Services/Collectors/collectors.service';

@ApiTags('Collectors')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Company-Code',
  required: true,
  description: 'Código de la Company activa; el backend resuelve CompanyContext y el schema.',
})
@UseGuards(JwtAuthGuard, CompanyContextGuard, ServiceRolesGuard)
@Controller()
export class CollectorsController {
  constructor(private readonly collectors: CollectorsService) {}

  @Get('collectors')
  @ServiceRoles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Listar Collectors; admite filtro serviceId' })
  list(@CurrentCompany() company: CompanyContext, @Query() query: unknown) {
    return this.collectors.list(company, this.parse(CollectorFiltersSchema, query));
  }

  @Get('services/:serviceId/collectors')
  @ServiceRoles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Listar Collectors asociados a un Servicio' })
  getByService(
    @CurrentCompany() company: CompanyContext,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query() query: unknown,
  ) {
    return this.collectors.getByService(company, serviceId, this.parse(CollectorExecutionFiltersSchema, query));
  }

  @Get('collectors/:id')
  @ServiceRoles('ADMIN', 'VIEWER')
  get(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.get(company, id);
  }

  @Post('collectors')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: CreateCollectorDto })
  @ApiOperation({ summary: 'Crear un Collector asociado obligatoriamente a un Servicio' })
  create(@CurrentCompany() company: CompanyContext, @Body() body: unknown) {
    return this.collectors.create(company, this.parse(CreateCollectorSchema, body));
  }

  @Patch('collectors/:id')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: UpdateCollectorDto })
  update(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.collectors.update(company, id, this.parse(UpdateCollectorSchema, body));
  }

  @Delete('collectors/:id')
  @ServiceRoles('ADMIN')
  delete(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.delete(company, id);
  }

  @Post('collectors/:id/duplicate')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: DuplicateCollectorDto })
  duplicate(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const input = this.parse(DuplicateCollectorSchema, body);
    return this.collectors.duplicate(company, id, input.code, input.name);
  }

  @Patch('collectors/:id/status')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: CollectorStatusDto })
  setStatus(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED']) }).strict();
    return this.collectors.setStatus(company, id, this.parse(parsed, body).status);
  }

  @Get('collectors/:id/configuration')
  @ServiceRoles('ADMIN', 'VIEWER')
  getConfiguration(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.getConfiguration(company, id);
  }

  @Put('collectors/:id/configuration')
  @ServiceRoles('ADMIN')
  @ApiOperation({ summary: 'Guardar atómicamente la configuración agregada del Collector' })
  saveConfiguration(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.collectors.saveConfiguration(company, id, this.parse(CollectorConfigurationSchema, body));
  }

  @Post('collectors/:id/validate')
  @ServiceRoles('ADMIN')
  validate(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.validate(company, id);
  }

  @Post('collectors/:id/run')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: CollectorRunDto })
  @ApiOperation({ summary: 'Encolar una solicitud; no ejecuta la recolección en el proceso HTTP' })
  enqueue(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const input = this.parse(CollectorRunSchema, body ?? {});
    return this.collectors.enqueue(company, id, input.triggerType);
  }

  @Get('collectors/:id/executions')
  @ServiceRoles('ADMIN', 'VIEWER')
  listExecutions(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: unknown,
  ) {
    return this.collectors.listExecutions(company, id, this.parse(CollectorExecutionFiltersSchema, query));
  }

  @Get('collectors/:id/executions/:executionId')
  @ServiceRoles('ADMIN', 'VIEWER')
  getExecution(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Param('executionId', ParseIntPipe) executionId: number,
  ) {
    return this.collectors.getExecution(company, id, executionId);
  }

  @Get('collectors/:id/health')
  @ServiceRoles('ADMIN', 'VIEWER')
  health(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.health(company, id);
  }

  @Get('collectors/:id/versions')
  @ServiceRoles('ADMIN', 'VIEWER')
  listVersions(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.collectors.listVersions(company, id);
  }

  @Get('collectors/:id/versions/:version')
  @ServiceRoles('ADMIN', 'VIEWER')
  getVersion(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.collectors.getVersion(company, id, version);
  }

  private parse<TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.output<TSchema> {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message));
    }
    return result.data;
  }
}
