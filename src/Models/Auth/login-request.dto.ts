import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@kindmetrics.com', maxLength: 255 })
  email!: string;

  @ApiProperty({ example: 'your-password', maxLength: 128 })
  password!: string;
}