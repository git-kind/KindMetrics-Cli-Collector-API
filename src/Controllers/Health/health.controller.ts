import { Controller, Get } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiErrorDto,
  ApiResponseDto,
  ApiResponseMetaDto,
} from '../../Models/Common/api-response.dto';
import { HealthResponseDto } from '../../Models/Common/health-response.dto';
import { HealthService } from '../../Services/Health/health.service';

@ApiTags('Health')
@ApiExtraModels(ApiResponseDto, ApiResponseMetaDto, ApiErrorDto, HealthResponseDto)
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Consultar estado del servicio' })
  @ApiOkResponse({
    description: 'Estado de la API y conectividad de base de datos.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(HealthResponseDto) },
          },
        },
      ],
    },
  })
  @Get()
  getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealth();
  }
}