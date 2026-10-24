import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorDto,
  ApiResponseDto,
  ApiResponseMetaDto,
} from '../../Models/Common/api-response.dto';
import {
  CompanyResponseDto,
  CompanyDatabaseResponseDto,
  CreateCompanyDto,
  CreateCompanySchema,
  UpdateCompanyDto,
  UpdateCompanySchema,
} from '../../Models/Company/company.dto';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CompanyService } from '../../Services/Company/company.service';

@ApiTags('Companies')
@ApiBearerAuth()
@ApiExtraModels(
  ApiResponseDto,
  ApiResponseMetaDto,
  ApiErrorDto,
  CompanyResponseDto,
)
@UseGuards(PlatformAdminGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companies: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Listar Companies' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  list() {
    return this.companies.list();
  }

  @Get(':guid')
  @ApiOperation({ summary: 'Obtener Company por GUID' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  get(@Param('guid', new ParseUUIDPipe()) guid: string) {
    return this.companies.get(guid);
  }

  @Post()
  @ApiOperation({ summary: 'Crear Company' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, type: ApiResponseDto })
  async create(@Body() body: unknown) {
    const parsed = CreateCompanySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return this.companies.create(parsed.data);
  }

  @Patch(':guid')
  @ApiOperation({ summary: 'Actualizar Company' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  async update(
    @Param('guid', new ParseUUIDPipe()) guid: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateCompanySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return this.companies.update(guid, parsed.data);
  }

  @Delete(':guid')
  @ApiOperation({ summary: 'Eliminar Company' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  delete(@Param('guid', new ParseUUIDPipe()) guid: string) {
    return this.companies.delete(guid);
  }

  @Post(':guid/database')
  @ApiOperation({
    summary: 'Crear la base de datos vacía asociada a una Company',
  })
  @ApiResponse({ status: 200, type: CompanyDatabaseResponseDto })
  @HttpCode(HttpStatus.OK)
  createDatabase(@Param('guid', new ParseUUIDPipe()) guid: string) {
    return this.companies.createDatabase(guid);
  }
}