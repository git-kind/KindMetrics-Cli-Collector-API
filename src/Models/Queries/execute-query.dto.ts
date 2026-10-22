import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ExecuteQuerySchema = z.object({
  query: z.string().min(1),
  datasourceGuid: z.string().uuid(),
  parameters: z.array(z.unknown()).optional(),
});

export class ExecuteQueryDto {
  @ApiProperty({ example: 'SELECT 1' })
  query!: string;

  @ApiProperty({ format: 'uuid' })
  datasourceGuid!: string;

  @ApiProperty({ type: [Object], required: false })
  parameters?: unknown[];
}