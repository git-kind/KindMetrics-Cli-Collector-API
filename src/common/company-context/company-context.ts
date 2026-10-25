export interface CompanyContext {
  readonly companyGuid: string;
  readonly userGuid: string;
}

export interface CompanyContextRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub?: string };
  companyContext?: CompanyContext;
}