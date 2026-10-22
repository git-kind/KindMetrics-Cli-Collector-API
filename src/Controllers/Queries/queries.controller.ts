import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiErrorDto,
  ApiResponseDto,
  ApiResponseMetaDto,
} from '../../Models/Common/api-response.dto';
import {
  ExecuteQueryDto,
  ExecuteQuerySchema,
} from '../../Models/Queries/execute-query.dto';
import { QueriesService } from '../../Services/Queries/queries.service';

@ApiTags('Queries')
@ApiExtraModels(ApiResponseDto, ApiResponseMetaDto, ApiErrorDto)
@Controller('queries')
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Ejecutar una consulta validada' })
  @ApiBody({ type: ExecuteQueryDto })
  @ApiResponse({
    status: 501,
    description:
      'La ejecución está bloqueada hasta implementar controles de seguridad.',
    schema: { $ref: getSchemaPath(ApiResponseDto) },
  })
  execute(@Body() body: unknown): never {
    const parsed = ExecuteQuerySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    return this.queriesService.execute();
  }
}