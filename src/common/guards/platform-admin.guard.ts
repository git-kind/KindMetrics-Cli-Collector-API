import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';

interface PlatformAdminToken {
  sub: string;
  isPlatformAdmin: boolean;
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Se requiere autenticación Bearer.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PlatformAdminToken>(
        token,
        { secret: this.config.get<string>('auth.jwtSecret') },
      );
      if (payload.isPlatformAdmin !== true || !payload.sub) {
        throw new ForbiddenException('Se requiere perfil administrador.');
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}