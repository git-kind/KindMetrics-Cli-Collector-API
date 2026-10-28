export interface CompanyContext {
  readonly companyGuid: string;
  readonly userGuid: string;
  readonly roles: readonly string[];
}

export interface CompanyContextRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub?: string; isPlatformAdmin?: boolean };
  companyContext?: CompanyContext;
}