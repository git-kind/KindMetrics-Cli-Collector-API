import {
  CanActivate,
  BadRequestException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CompanyContextRequest } from './company-context';
import { CompanyDatabaseResolver } from './company-database.resolver';

@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(private readonly resolver: CompanyDatabaseResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & CompanyContextRequest>();
    const companyHeader = request.headers['x-company-code'];
    const companyCode = z.string().trim().min(1).max(60).safeParse(companyHeader);
    if (!companyCode.success) {
      throw new BadRequestException('El header X-Company-Code es obligatorio.');
    }

    const userGuid = request.user?.sub;
    if (!userGuid) throw new UnauthorizedException('No se pudo identificar al usuario.');
    request.companyContext = await this.resolver.resolve(
      companyCode.data,
      userGuid,
      request.user?.isPlatformAdmin === true,
    );
    return true;
  }
}