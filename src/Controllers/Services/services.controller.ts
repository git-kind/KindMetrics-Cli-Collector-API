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
  CreateServiceDto,
  CreateServiceSchema,
  DuplicateServiceDto,
  DuplicateServiceSchema,
  ServiceConnectionDto,
  ServiceConnectionSchema,
  ServiceCredentialDto,
  ServiceCredentialSchema,
  ServiceFiltersSchema,
  ServiceStatusDto,
  ServiceStatusSchema,
  UpdateServiceDto,
  UpdateServiceSchema,
} from '../../Models/Services/service.dto';
import { ServicesService } from '../../Services/Services/services.service';

@ApiTags('Services')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Company-Code',
  required: true,
  description: 'Código de la Company activa; el backend resuelve el schema autorizado.',
})
@UseGuards(JwtAuthGuard, CompanyContextGuard, ServiceRolesGuard)
@Controller()
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get('services')
  @ServiceRoles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Listar servicios de la Company' })
  list(@CurrentCompany() company: CompanyContext, @Query() query: unknown) {
    return this.services.list(company, this.parse(ServiceFiltersSchema, query));
  }

  @Get('services/:id')
  @ServiceRoles('ADMIN', 'VIEWER')
  @ApiOperation({ summary: 'Consultar un servicio' })
  get(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.get(company, id);
  }

  @Post('services')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: CreateServiceDto })
  @ApiOperation({ summary: 'Crear un servicio' })
  create(@CurrentCompany() company: CompanyContext, @Body() body: unknown) {
    return this.services.create(company, this.parse(CreateServiceSchema, body));
  }

  @Patch('services/:id')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: UpdateServiceDto })
  @ApiOperation({ summary: 'Actualizar un servicio' })
  update(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.services.update(company, id, this.parse(UpdateServiceSchema, body));
  }

  @Delete('services/:id')
  @ServiceRoles('ADMIN')
  @ApiOperation({ summary: 'Eliminar un servicio sin dependencias de credenciales' })
  delete(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.delete(company, id);
  }

  @Post('services/:id/duplicate')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: DuplicateServiceDto })
  duplicate(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const input = this.parse(DuplicateServiceSchema, body);
    return this.services.duplicate(company, id, input.code, input.name);
  }

  @Patch('services/:id/status')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: ServiceStatusDto })
  setStatus(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.services.setStatus(company, id, this.parse(ServiceStatusSchema, body).isActive);
  }

  @Post('services/:id/test-connection')
  @ServiceRoles('ADMIN')
  @ApiOperation({ summary: 'Probar conexión cuando exista un driver instalado' })
  testConnection(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.testConnection(company, id);
  }

  @Get('services/:id/usage')
  @ServiceRoles('ADMIN', 'VIEWER')
  usage(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.usage(company, id);
  }

  @Get('services/:id/connection')
  @ServiceRoles('ADMIN', 'VIEWER')
  getConnection(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.getConnection(company, id);
  }

  @Patch('services/:id/connection')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: ServiceConnectionDto })
  upsertConnection(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.services.upsertConnection(company, id, this.parse(ServiceConnectionSchema, body));
  }

  @Get('services/:id/credentials')
  @ServiceRoles('ADMIN', 'VIEWER')
  listCredentials(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.listCredentials(company, id);
  }

  @Post('services/:id/credentials')
  @ServiceRoles('ADMIN')
  @ApiBody({ type: ServiceCredentialDto })
  upsertCredential(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.services.upsertCredential(company, id, this.parse(ServiceCredentialSchema, body));
  }

  @Delete('service-credentials/:credentialId')
  @ServiceRoles('ADMIN')
  deleteCredential(
    @CurrentCompany() company: CompanyContext,
    @Param('credentialId', ParseIntPipe) credentialId: number,
  ) {
    return this.services.deleteCredential(company, credentialId);
  }

  @Get('services/:id/versions')
  @ServiceRoles('ADMIN', 'VIEWER')
  listVersions(@CurrentCompany() company: CompanyContext, @Param('id', ParseIntPipe) id: number) {
    return this.services.listVersions(company, id);
  }

  @Get('services/:id/versions/:version')
  @ServiceRoles('ADMIN', 'VIEWER')
  getVersion(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.services.getVersion(company, id, version);
  }

  @Get('service-types')
  @ServiceRoles('ADMIN', 'VIEWER')
  listTypes(@CurrentCompany() company: CompanyContext) {
    return this.services.listTypes(company);
  }

  @Get('service-drivers')
  @ServiceRoles('ADMIN', 'VIEWER')
  listDrivers(@CurrentCompany() company: CompanyContext, @Query('serviceTypeId') rawId?: string) {
    const serviceTypeId = rawId === undefined ? undefined : z.coerce.number().int().positive().safeParse(rawId);
    if (serviceTypeId && !serviceTypeId.success) throw new BadRequestException('serviceTypeId debe ser un entero positivo.');
    return this.services.listDrivers(company, serviceTypeId?.data);
  }

  @Get('service-auth-types')
  @ServiceRoles('ADMIN', 'VIEWER')
  listAuthTypes(@CurrentCompany() company: CompanyContext, @Query('driverKey') driverKey?: string) {
    return this.services.listAuthTypes(company, driverKey);
  }

  private parse<TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.output<TSchema> {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message));
    }
    return result.data;
  }
}
