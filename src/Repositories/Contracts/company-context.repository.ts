export const COMPANY_CONTEXT_REPOSITORY = Symbol('COMPANY_CONTEXT_REPOSITORY');

export interface CompanyContextResolution {
  companyExists: boolean;
  userHasAccess: boolean;
}

export interface CompanyContextRepository {
  validateUserAccess(
    companyGuid: string,
    userGuid: string,
  ): Promise<boolean>;
  findActiveCompanyDatabaseName(companyGuid: string): Promise<string | null>;
}