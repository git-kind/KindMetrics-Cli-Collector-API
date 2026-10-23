import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { LoginResponseDto } from '../../Models/Auth/login-response.dto';
import {
  AUTH_REPOSITORY,
  AuthRepository,
} from '../../Repositories/Contracts/auth.repository';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly expiresIn: number;

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.jwtSecret = config.get<string>('auth.jwtSecret') ?? '';
    this.expiresIn = config.get<number>('auth.jwtExpiresIn') ?? 900;
  }

  async login(email: string, password: string): Promise<LoginResponseDto> {
    if (!this.jwtSecret) {
      throw new InternalServerErrorException(
        'La autenticación no está configurada.',
      );
    }

    const user = await this.authRepository.findUserByEmail(email);
    const passwordMatches = user
      ? await verify(user.password_hash, password)
      : false;

    if (!user || user.status !== 'ACTIVE' || !passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const isPlatformAdmin = Number(user.is_platform_admin) === 1;
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.guid,
        email: user.email,
        isPlatformAdmin,
      },
      { secret: this.jwtSecret, expiresIn: this.expiresIn },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: {
        guid: user.guid,
        email: user.email,
        name: user.name,
        isPlatformAdmin,
      },
    };
  }
}