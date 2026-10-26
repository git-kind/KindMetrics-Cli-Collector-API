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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
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
  CreateExtractionMethodDto,
  CreateExtractionMethodSchema,
  ExtractionMethodResponseDto,
  UpdateExtractionMethodDto,
  UpdateExtractionMethodSchema,
} from '../../Models/ExtractionMethods/extraction-method.dto';
import { ExtractionMethodService } from '../../Services/ExtractionMethods/extraction-method.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/company-context/company-context.guard';
import { CurrentCompany } from '../../common/company-context/company-context.decorator';
import { CompanyContext } from '../../common/company-context/company-context';

@ApiTags('Extraction Methods')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Company-Code',
  required: true,
  description: 'Código de la Company activa; el backend resuelve su GUID y base de datos.',
})
@ApiExtraModels(ApiResponseDto, ApiResponseMetaDto, ApiErrorDto, ExtractionMethodResponseDto)
@UseGuards(JwtAuthGuard, CompanyContextGuard)
@Controller('extraction-methods')
export class ExtractionMethodController {
  constructor(private readonly methods: ExtractionMethodService) {}

  @Get()
  @ApiOperation({ summary: 'Listar métodos de extracción de la Company' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  list(@CurrentCompany() company: CompanyContext) {
    return this.methods.list(company);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un método de extracción' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  get(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.methods.get(company, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un método de extracción' })
  @ApiBody({ type: CreateExtractionMethodDto })
  @ApiResponse({ status: 201, type: ApiResponseDto })
  async create(
    @CurrentCompany() company: CompanyContext,
    @Body() body: unknown,
  ) {
    const parsed = CreateExtractionMethodSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message));
    }
    return this.methods.create(company, parsed.data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un método de extracción' })
  @ApiBody({ type: UpdateExtractionMethodDto })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  async update(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const parsed = UpdateExtractionMethodSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message));
    }
    return this.methods.update(company, id, parsed.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un método de extracción' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  delete(
    @CurrentCompany() company: CompanyContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.methods.delete(company, id);
  }
}