import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMPANY_CONTEXT_REPOSITORY,
  CompanyContextRepository,
} from '../../Repositories/Contracts/company-context.repository';
import { CompanyContext } from './company-context';
import { Inject } from '@nestjs/common';

@Injectable()
export class CompanyDatabaseResolver {
  constructor(
    @Inject(COMPANY_CONTEXT_REPOSITORY)
    private readonly companies: CompanyContextRepository,
  ) {}

  async resolve(
    companyCode: string,
    userGuid: string,
    isPlatformAdmin: boolean,
  ): Promise<CompanyContext> {
    const companyGuid = await this.companies.findActiveCompanyGuidByCode(companyCode);
    if (!companyGuid) {
      throw new NotFoundException('Company no encontrada o inactiva.');
    }

    const hasAccess = isPlatformAdmin ||
      await this.companies.validateUserAccess(companyGuid, userGuid);
    if (!hasAccess) {
      throw new ForbiddenException('El usuario no tiene acceso a esta Company.');
    }

    const roles = isPlatformAdmin
      ? ['ADMIN']
      : await this.companies.findUserRoleCodes(companyGuid, userGuid);
    return { companyGuid, userGuid, roles };
  }
}