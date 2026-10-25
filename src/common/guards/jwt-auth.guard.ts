import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';

interface AuthenticatedToken {
  sub: string;
  email?: string;
  isPlatformAdmin?: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Se requiere autenticación Bearer.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedToken>(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });
      if (!payload.sub) throw new UnauthorizedException('Token inválido o expirado.');
      (request as FastifyRequest & { user?: AuthenticatedToken }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}