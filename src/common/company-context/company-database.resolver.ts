import { ForbiddenException, Injectable } from '@nestjs/common';
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

  async resolve(companyGuid: string, userGuid: string): Promise<CompanyContext> {
    const hasAccess = await this.companies.validateUserAccess(companyGuid, userGuid);
    if (!hasAccess) {
      throw new ForbiddenException('El usuario no tiene acceso a esta Company.');
    }

    return { companyGuid, userGuid };
  }
}