export const COMPANY_CONTEXT_REPOSITORY = Symbol('COMPANY_CONTEXT_REPOSITORY');

export interface CompanyContextResolution {
  companyExists: boolean;
  userHasAccess: boolean;
}

export interface CompanyContextRepository {
  findActiveCompanyGuidByCode(companyCode: string): Promise<string | null>;
  validateUserAccess(
    companyGuid: string,
    userGuid: string,
  ): Promise<boolean>;
  findUserRoleCodes(companyGuid: string, userGuid: string): Promise<string[]>;
  findActiveCompanyDatabaseName(companyGuid: string): Promise<string | null>;
}