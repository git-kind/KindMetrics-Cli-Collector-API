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
    const companyHeader = request.headers['x-company-id'];
    const companyGuid = z.string().uuid().safeParse(companyHeader);
    if (!companyGuid.success) {
      throw new BadRequestException('El header X-Company-Id debe contener un GUID válido.');
    }

    const userGuid = request.user?.sub;
    if (!userGuid) throw new UnauthorizedException('No se pudo identificar al usuario.');
    request.companyContext = await this.resolver.resolve(companyGuid.data, userGuid);
    return true;
  }
}