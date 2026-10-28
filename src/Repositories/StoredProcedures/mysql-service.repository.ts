import { Injectable } from '@nestjs/common';
import { CompanyDatabaseRepository } from '../../infrastructure/database/company-database.repository';
import { DatabaseQueryParameter } from '../../infrastructure/database/database-connection';
import {
  CreateServiceInput,
  ServiceConnectionInput,
  ServiceCredentialInput,
  ServiceFilters,
  UpdateServiceInput,
} from '../../Models/Services/service.dto';
import { ServiceRecord, ServiceRepository } from '../Contracts/service.repository';

type Row = Record<string, unknown>;

@Injectable()
export class MySqlServiceRepository implements ServiceRepository {
  constructor(private readonly companyDatabase: CompanyDatabaseRepository) {}

  list(companyGuid: string, filters: ServiceFilters): Promise<ServiceRecord[]> {
    return this.call(companyGuid, 'sp_service_list', [
      filters.search ?? null,
      filters.serviceTypeId ?? null,
      filters.isActive ?? null,
      filters.page,
      filters.pageSize,
    ]).then((rows) => rows.map((row) => this.parseJsonFields(row)) as ServiceRecord[]);
  }

  async get(companyGuid: string, id: number): Promise<ServiceRecord | null> {
    const row = (await this.call(companyGuid, 'sp_service_get', [id]))[0];
    return row ? this.parseJsonFields(row) as ServiceRecord : null;
  }

  async create(companyGuid: string, input: CreateServiceInput, userGuid: string): Promise<ServiceRecord> {
    const driverKey = await this.resolveDefaultDriverKey(companyGuid, input.serviceTypeId);
    const row = (await this.call(companyGuid, 'sp_service_create', [
      input.serviceTypeId, driverKey, input.code, input.name,
      input.description ?? null, input.isActive, userGuid,
    ]))[0];
    return this.parseJsonFields(row) as ServiceRecord;
  }

  async update(companyGuid: string, id: number, input: UpdateServiceInput, userGuid: string): Promise<ServiceRecord | null> {
    const effectiveServiceTypeId = input.serviceTypeId ?? undefined;
    const resolvedDriverKey = effectiveServiceTypeId === undefined
      ? undefined
      : await this.resolveDefaultDriverKey(companyGuid, effectiveServiceTypeId);

    const values: DatabaseQueryParameter[] = [
      id,
      input.serviceTypeId ?? null, input.serviceTypeId !== undefined,
      resolvedDriverKey ?? null, resolvedDriverKey !== undefined,
      input.code ?? null, input.code !== undefined,
      input.name ?? null, input.name !== undefined,
      input.description ?? null, input.description !== undefined,
      input.isActive ?? null, input.isActive !== undefined, userGuid,
    ];
    const row = (await this.call(companyGuid, 'sp_service_update', values))[0];
    return row ? this.parseJsonFields(row) as ServiceRecord : null;
  }

  async duplicate(companyGuid: string, id: number, code: string, name: string, userGuid: string): Promise<ServiceRecord | null> {
    const row = (await this.call(companyGuid, 'sp_service_duplicate', [id, code, name, userGuid]))[0];
    return row ? this.parseJsonFields(row) as ServiceRecord : null;
  }

  async setStatus(companyGuid: string, id: number, isActive: boolean, userGuid: string): Promise<ServiceRecord | null> {
    const row = (await this.call(companyGuid, 'sp_service_set_status', [id, isActive, userGuid]))[0];
    return row ? this.parseJsonFields(row) as ServiceRecord : null;
  }

  async delete(companyGuid: string, id: number): Promise<boolean> {
    const row = (await this.call<Row>(companyGuid, 'sp_service_delete', [id]))[0];
    return Number(row?.affected ?? 0) > 0;
  }

  async usage(companyGuid: string, id: number): Promise<Row | null> {
    return (await this.call<Row>(companyGuid, 'sp_service_get_usage', [id]))[0] ?? null;
  }

  listTypes(companyGuid: string): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_type_list');
  }

  listDrivers(companyGuid: string, serviceTypeId?: number): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_driver_list', [serviceTypeId ?? null]);
  }

  listAuthTypes(companyGuid: string, driverKey?: string): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_auth_type_list', [driverKey ?? null]);
  }

  async getConnection(companyGuid: string, id: number): Promise<Row | null> {
    return (await this.call(companyGuid, 'sp_service_connection_get', [id]))[0] ?? null;
  }

  async upsertConnection(companyGuid: string, id: number, input: ServiceConnectionInput, userGuid: string): Promise<Row | null> {
    const row = (await this.call(companyGuid, 'sp_service_connection_upsert', [
      id,
      JSON.stringify(input.connectionConfig),
      input.authTypeId,
      JSON.stringify(input.authConfig),
      input.authAlgorithm ?? null,
      input.encryptionAlgorithm ?? null,
      JSON.stringify(input.additionalParameters),
      userGuid,
    ]))[0];
    return row ? this.parseJsonFields(row) : null;
  }

  listCredentials(companyGuid: string, id: number): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_credential_list', [id]);
  }

  upsertCredential(companyGuid: string, id: number, input: ServiceCredentialInput): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_credential_reference_upsert', [
      id, input.credentialType, input.credentialReference, input.expiresAt ?? null,
    ]);
  }

  async deleteCredential(companyGuid: string, credentialId: number): Promise<boolean> {
    const row = (await this.call<Row>(companyGuid, 'sp_service_credential_reference_delete', [credentialId]))[0];
    return Number(row?.affected ?? 0) > 0;
  }

  listVersions(companyGuid: string, id: number): Promise<Row[]> {
    return this.call(companyGuid, 'sp_service_version_list', [id]);
  }

  async getVersion(companyGuid: string, id: number, version: number): Promise<Row | null> {
    return (await this.call(companyGuid, 'sp_service_version_get', [id, version]))[0] ?? null;
  }

  private call<TResult extends Row = Row>(
    companyGuid: string,
    procedure: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult[]> {
    return this.companyDatabase.call<TResult[]>(companyGuid, procedure, parameters);
  }

  private async resolveDefaultDriverKey(companyGuid: string, serviceTypeId: number): Promise<string> {
    const drivers = await this.listDrivers(companyGuid, serviceTypeId);
    const driverKey = drivers[0]?.driverKey ?? drivers[0]?.driver_key;
    if (typeof driverKey !== 'string' || driverKey.trim().length === 0) {
      throw new Error('SERVICE_TYPE_DRIVER_NOT_AVAILABLE');
    }
    return driverKey;
  }

  private parseJsonFields(row: Row): Row {
    const { authConfig: _authConfig, ...safeRow } = row;
    return {
      ...safeRow,
      authConfigured: row.authConfigured ?? Boolean(_authConfig),
      capabilities: this.parseJson(row.capabilities),
      connectionConfig: this.parseJson(row.connectionConfig),
      additionalParameters: this.parseJson(row.additionalParameters),
      configurationSnapshot: this.parseJson(row.configurationSnapshot),
    };
  }

  private parseJson(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
}
