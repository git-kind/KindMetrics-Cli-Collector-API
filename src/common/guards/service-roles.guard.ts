import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { CompanyContextRequest } from '../company-context/company-context';

const SERVICE_ROLES = 'service-roles';
export const ServiceRoles = (...roles: string[]) => SetMetadata(SERVICE_ROLES, roles);

@Injectable()
export class ServiceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SERVICE_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];
    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<
      FastifyRequest & CompanyContextRequest
    >();
    if (request.user?.isPlatformAdmin === true) return true;

    const userRoles = request.companyContext?.roles ?? [];
    if (required.some((role) => userRoles.includes(role))) return true;
    throw new ForbiddenException('El perfil no tiene permisos para esta operación.');
  }
}
