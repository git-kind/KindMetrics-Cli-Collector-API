import { Injectable } from '@nestjs/common';
import { CompanyDatabaseRepository } from '../../infrastructure/database/company-database.repository';
import { DatabaseQueryParameter } from '../../infrastructure/database/database-connection';
import {
  CollectorConfiguration,
  CollectorExecutionFilters,
  CollectorFilters,
  CreateCollectorInput,
  UpdateCollectorInput,
} from '../../Models/Collectors/collector.dto';
import { CollectorRepository, CollectorRow } from '../Contracts/collector.repository';

type Row = Record<string, unknown>;

@Injectable()
export class MySqlCollectorRepository implements CollectorRepository {
  constructor(private readonly companyDatabase: CompanyDatabaseRepository) {}

  list(companyGuid: string, filters: CollectorFilters): Promise<CollectorRow[]> {
    return this.call(companyGuid, 'sp_collector_list', [
      filters.search ?? null, filters.serviceId ?? null, filters.status ?? null,
      filters.page, filters.pageSize,
    ]).then((rows) => rows.map((row) => this.parseJsonFields(row)) as CollectorRow[]);
  }

  async get(companyGuid: string, id: number): Promise<CollectorRow | null> {
    const row = (await this.call(companyGuid, 'sp_collector_get', [id]))[0];
    return row ? this.parseJsonFields(row) as CollectorRow : null;
  }

  async create(companyGuid: string, input: CreateCollectorInput, userGuid: string): Promise<CollectorRow> {
    const row = (await this.call(companyGuid, 'sp_collector_create', [
      input.serviceId, input.code, input.name, input.description ?? null,
      input.collectorType, input.status, JSON.stringify(input.tags), userGuid,
    ]))[0];
    return this.parseJsonFields(row) as CollectorRow;
  }

  async update(companyGuid: string, id: number, input: UpdateCollectorInput, userGuid: string): Promise<CollectorRow | null> {
    const parameters: DatabaseQueryParameter[] = [
      id,
      input.serviceId ?? null, input.serviceId !== undefined,
      input.code ?? null, input.code !== undefined,
      input.name ?? null, input.name !== undefined,
      input.description ?? null, input.description !== undefined,
      input.collectorType ?? null, input.collectorType !== undefined,
      input.status ?? null, input.status !== undefined,
      input.tags === undefined ? null : JSON.stringify(input.tags), input.tags !== undefined,
      userGuid,
    ];
    const row = (await this.call(companyGuid, 'sp_collector_update', parameters))[0];
    return row ? this.parseJsonFields(row) as CollectorRow : null;
  }

  async duplicate(companyGuid: string, id: number, code: string, name: string, userGuid: string): Promise<CollectorRow | null> {
    const row = (await this.call(companyGuid, 'sp_collector_duplicate', [id, code, name, userGuid]))[0];
    return row ? this.parseJsonFields(row) as CollectorRow : null;
  }

  async setStatus(companyGuid: string, id: number, status: string, userGuid: string): Promise<CollectorRow | null> {
    const row = (await this.call(companyGuid, 'sp_collector_set_status', [id, status, userGuid]))[0];
    return row ? this.parseJsonFields(row) as CollectorRow : null;
  }

  async delete(companyGuid: string, id: number): Promise<boolean> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_delete', [id]))[0];
    return Number(row?.affected ?? 0) > 0;
  }

  async getConfiguration(companyGuid: string, id: number): Promise<Row | null> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_get_configuration', [id]))[0];
    if (!row) return null;
    return { ...row, configuration: this.parseJson(row.configuration) };
  }

  async saveConfiguration(companyGuid: string, id: number, configuration: CollectorConfiguration, userGuid: string): Promise<Row | null> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_save_configuration', [
      id, JSON.stringify(configuration), userGuid,
    ]))[0];
    return row ? { ...row, configuration: this.parseJson(row.configuration) } : null;
  }

  async validate(companyGuid: string, id: number): Promise<{ valid: true }> {
    const collector = await this.get(companyGuid, id);
    if (!collector) return null as never;
    const configuration = await this.getConfiguration(companyGuid, id);
    const config = configuration?.configuration as CollectorConfiguration | undefined;
    await this.call(companyGuid, 'sp_collector_validate_references', [
      collector.serviceId,
      JSON.stringify(config?.methods ?? []),
    ]);
    return { valid: true };
  }

  async usageByService(companyGuid: string, serviceId: number): Promise<number> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_get_usage', [serviceId]))[0];
    return Number(row?.collectorCount ?? 0);
  }

  async enqueue(companyGuid: string, id: number, triggerType: string, userGuid: string): Promise<Row> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_execution_create', [id, triggerType, userGuid]))[0];
    return row ?? {};
  }

  listExecutions(companyGuid: string, id: number, filters: CollectorExecutionFilters): Promise<Row[]> {
    return this.call(companyGuid, 'sp_collector_execution_list', [id, filters.page, filters.pageSize]);
  }

  async getExecution(companyGuid: string, id: number, executionId: number): Promise<Row | null> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_execution_get', [id, executionId]))[0];
    return row ? { ...row, details: this.parseJson(row.details) } : null;
  }

  async health(companyGuid: string, id: number): Promise<Row | null> {
    return (await this.call<Row>(companyGuid, 'sp_collector_health', [id]))[0] ?? null;
  }

  listVersions(companyGuid: string, id: number): Promise<Row[]> {
    return this.call(companyGuid, 'sp_collector_version_list', [id]);
  }

  async getVersion(companyGuid: string, id: number, version: number): Promise<Row | null> {
    const row = (await this.call<Row>(companyGuid, 'sp_collector_version_get', [id, version]))[0];
    return row ? { ...row, configurationSnapshot: this.parseJson(row.configurationSnapshot) } : null;
  }

  getByService(companyGuid: string, serviceId: number, filters: CollectorExecutionFilters): Promise<CollectorRow[]> {
    return this.call(companyGuid, 'sp_collector_get_by_service', [serviceId, filters.page, filters.pageSize])
      .then((rows) => rows.map((row) => this.parseJsonFields(row)) as CollectorRow[]);
  }

  private call<TResult extends Row = Row>(
    companyGuid: string,
    procedure: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult[]> {
    return this.companyDatabase.call<TResult[]>(companyGuid, procedure, parameters);
  }

  private parseJsonFields(row: Row): Row {
    return {
      ...row,
      tags: this.parseJson(row.tags),
      details: this.parseJson(row.details),
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
