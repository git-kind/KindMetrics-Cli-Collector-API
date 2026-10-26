import { Injectable } from '@nestjs/common';
import { LocalStoredProcedureRepository } from './local-stored-procedure.repository';
import {
  CreateConnectorInput,
  CreateProviderInput,
  ExtractionCatalogFilters,
  ExtractionCatalogRepository,
  UpdateConnectorInput,
  UpdateProviderInput,
} from '../Contracts/extraction-catalog.repository';

type DbValue = string | number | boolean | null;
type CatalogRow = Record<string, unknown>;

@Injectable()
export class MySqlExtractionCatalogRepository implements ExtractionCatalogRepository {
  constructor(private readonly procedures: LocalStoredProcedureRepository) {}

  listProviders(filters: ExtractionCatalogFilters): Promise<CatalogRow[]> {
    return this.call<CatalogRow[]>('sp_extraction_provider_list', [
      filters.search ?? null, filters.isActive ?? null, filters.pageSize,
      (filters.page - 1) * filters.pageSize,
    ]);
  }

  async getProvider(id: number): Promise<CatalogRow | null> {
    return (await this.call<CatalogRow[]>('sp_extraction_provider_get', [id]))[0] ?? null;
  }

  async createProvider(input: CreateProviderInput): Promise<CatalogRow> {
    return (await this.call<CatalogRow[]>('sp_extraction_provider_create', [
      input.code, input.name, input.description ?? null, input.isActive,
    ]))[0];
  }

  async updateProvider(id: number, input: UpdateProviderInput): Promise<CatalogRow | null> {
    const row = (await this.call<CatalogRow[]>('sp_extraction_provider_update', [
      id, input.code ?? null, input.code !== undefined,
      input.name ?? null, input.name !== undefined,
      input.description ?? null, input.description !== undefined,
      input.isActive ?? null, input.isActive !== undefined,
    ]))[0];
    return row ?? null;
  }

  async deleteProvider(id: number): Promise<boolean> {
    const row = (await this.call<Array<{ affected: number }>>('sp_extraction_provider_delete', [id]))[0];
    return Number(row?.affected ?? 0) > 0;
  }

  listConnectors(filters: ExtractionCatalogFilters): Promise<CatalogRow[]> {
    return this.call<CatalogRow[]>('sp_extraction_connector_list', [
      filters.providerId ?? null, filters.search ?? null, filters.isActive ?? null,
      filters.pageSize, (filters.page - 1) * filters.pageSize,
    ]).then((rows) => rows.map((row) => this.parseJsonFields(row)));
  }

  async getConnector(id: number): Promise<CatalogRow | null> {
    const row = (await this.call<CatalogRow[]>('sp_extraction_connector_get', [id]))[0];
    return row ? this.parseJsonFields(row) : null;
  }

  async createConnector(input: CreateConnectorInput): Promise<CatalogRow> {
    const row = (await this.call<CatalogRow[]>('sp_extraction_connector_create', [
      input.providerId, input.connectorKey, input.name, input.description ?? null,
      input.driverKey ?? null, input.driverVersion ?? null,
      input.configurationSchema == null ? null : JSON.stringify(input.configurationSchema),
      JSON.stringify(input.capabilities), input.isActive,
    ]))[0];
    return this.parseJsonFields(row);
  }

  async updateConnector(id: number, input: UpdateConnectorInput): Promise<CatalogRow | null> {
    const row = (await this.call<CatalogRow[]>('sp_extraction_connector_update', [
      id,
      input.providerId ?? null, input.providerId !== undefined,
      input.connectorKey ?? null, input.connectorKey !== undefined,
      input.name ?? null, input.name !== undefined,
      input.description ?? null, input.description !== undefined,
      input.driverKey ?? null, input.driverKey !== undefined,
      input.driverVersion ?? null, input.driverVersion !== undefined,
      input.configurationSchema == null ? null : JSON.stringify(input.configurationSchema),
      input.configurationSchema !== undefined,
      input.capabilities === undefined ? null : JSON.stringify(input.capabilities),
      input.capabilities !== undefined,
      input.isActive ?? null, input.isActive !== undefined,
    ]))[0];
    return row ? this.parseJsonFields(row) : null;
  }

  async deleteConnector(id: number): Promise<boolean> {
    const row = (await this.call<Array<{ affected: number }>>('sp_extraction_connector_delete', [id]))[0];
    return Number(row?.affected ?? 0) > 0;
  }

  private call<TResult>(procedure: string, parameters: DbValue[]): Promise<TResult> {
    return this.procedures.call<TResult>(procedure, parameters);
  }

  private parseJsonFields(row: CatalogRow): CatalogRow {
    return {
      ...row,
      configurationSchema: this.parseJson(row.configurationSchema),
      capabilities: this.parseJson(row.capabilities),
      isActive: Boolean(row.isActive),
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