import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
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
import { LoginRequestDto, LoginRequestSchema } from '../../Models/Auth/login-request.dto';
import { LoginResponseDto } from '../../Models/Auth/login-response.dto';
import { AuthService } from '../../Services/Auth/auth.service';

@ApiTags('Auth')
@ApiExtraModels(
  ApiResponseDto,
  ApiResponseMetaDto,
  ApiErrorDto,
  LoginResponseDto,
)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Autenticar un usuario local' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token de acceso y datos públicos del usuario.',
    schema: { $ref: getSchemaPath(ApiResponseDto) },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown): Promise<LoginResponseDto> {
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    return this.authService.login(parsed.data.email, parsed.data.password);
  }
}