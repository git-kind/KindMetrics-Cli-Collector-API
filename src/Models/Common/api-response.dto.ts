import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'El valor enviado no es válido.' })
  message!: string;

  @ApiPropertyOptional({ example: 'email' })
  field?: string;
}

export class ApiResponsePaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ApiResponseMetaDto {
  @ApiProperty({ example: 'req-123' })
  requestId!: string;

  @ApiPropertyOptional({ type: ApiResponsePaginationDto })
  pagination?: ApiResponsePaginationDto;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true })
  data!: T | null;

  @ApiProperty({ type: [ApiErrorDto] })
  errors!: ApiErrorDto[];

  @ApiProperty({ type: ApiResponseMetaDto })
  meta!: ApiResponseMetaDto;
}