import {
  CreateServiceInput,
  ServiceConnectionInput,
  ServiceCredentialInput,
  ServiceFilters,
  UpdateServiceInput,
} from '../../Models/Services/service.dto';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export type ServiceRecord = Record<string, unknown> & {
  id: number;
  code: string;
  name: string;
  driverKey: string;
  driverStatus: 'AVAILABLE' | 'INSTALLED' | 'NOT_IMPLEMENTED';
};

export interface ServiceRepository {
  list(companyGuid: string, filters: ServiceFilters): Promise<ServiceRecord[]>;
  get(companyGuid: string, id: number): Promise<ServiceRecord | null>;
  create(companyGuid: string, input: CreateServiceInput, userGuid: string): Promise<ServiceRecord>;
  update(companyGuid: string, id: number, input: UpdateServiceInput, userGuid: string): Promise<ServiceRecord | null>;
  duplicate(companyGuid: string, id: number, code: string, name: string, userGuid: string): Promise<ServiceRecord | null>;
  setStatus(companyGuid: string, id: number, isActive: boolean, userGuid: string): Promise<ServiceRecord | null>;
  delete(companyGuid: string, id: number): Promise<boolean>;
  usage(companyGuid: string, id: number): Promise<Record<string, unknown> | null>;
  listTypes(companyGuid: string): Promise<Record<string, unknown>[]>;
  listDrivers(companyGuid: string, serviceTypeId?: number): Promise<Record<string, unknown>[]>;
  listAuthTypes(companyGuid: string, driverKey?: string): Promise<Record<string, unknown>[]>;
  getConnection(companyGuid: string, id: number): Promise<Record<string, unknown> | null>;
  upsertConnection(companyGuid: string, id: number, input: ServiceConnectionInput, userGuid: string): Promise<Record<string, unknown> | null>;
  listCredentials(companyGuid: string, id: number): Promise<Record<string, unknown>[]>;
  upsertCredential(companyGuid: string, id: number, input: ServiceCredentialInput): Promise<Record<string, unknown>[]>;
  deleteCredential(companyGuid: string, credentialId: number): Promise<boolean>;
  listVersions(companyGuid: string, id: number): Promise<Record<string, unknown>[]>;
  getVersion(companyGuid: string, id: number, version: number): Promise<Record<string, unknown> | null>;
}
