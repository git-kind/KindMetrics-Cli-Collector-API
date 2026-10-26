import { Injectable } from '@nestjs/common';
import { CompanyDatabaseRepository } from '../../infrastructure/database/company-database.repository';
import {
  CreateExtractionMethodInput,
  ExtractionMethodRecord,
  ExtractionMethodRepository,
  UpdateExtractionMethodInput,
} from '../Contracts/extraction-method.repository';

@Injectable()
export class MySqlExtractionMethodRepository implements ExtractionMethodRepository {
  constructor(private readonly companyDatabase: CompanyDatabaseRepository) {}

  list(companyGuid: string): Promise<ExtractionMethodRecord[]> {
    return this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_list',
    ).then((methods) => methods.map((method) => this.parseJsonFields(method)));
  }

  async findById(companyGuid: string, id: number): Promise<ExtractionMethodRecord | null> {
    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_get',
      [id],
    );
    return rows[0] ? this.parseJsonFields(rows[0]) : null;
  }

  async create(
    companyGuid: string,
    input: CreateExtractionMethodInput,
  ): Promise<ExtractionMethodRecord> {
    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_create',
      [
        input.code,
        input.name,
        input.description ?? null,
        input.protocol,
        input.configurationSchema == null
          ? null
          : JSON.stringify(input.configurationSchema),
        input.isActive,
        JSON.stringify(input.parameters),
        JSON.stringify(input.requests),
        JSON.stringify(input.equipment),
      ],
    );
    return this.parseJsonFields(rows[0]);
  }

  async update(
    companyGuid: string,
    id: number,
    input: UpdateExtractionMethodInput,
  ): Promise<ExtractionMethodRecord | null> {
    const values = [
      id,
      input.code ?? null,
      input.code !== undefined,
      input.name ?? null,
      input.name !== undefined,
      input.description ?? null,
      input.description !== undefined,
      input.protocol ?? null,
      input.protocol !== undefined,
      input.configurationSchema == null
        ? null
        : JSON.stringify(input.configurationSchema),
      input.configurationSchema !== undefined,
      input.isActive ?? null,
      input.isActive !== undefined,
      input.parameters === undefined ? null : JSON.stringify(input.parameters),
      input.parameters !== undefined,
      input.requests === undefined ? null : JSON.stringify(input.requests),
      input.requests !== undefined,
      input.equipment === undefined ? null : JSON.stringify(input.equipment),
      input.equipment !== undefined,
    ];

    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_update',
      values,
    );
    const method = rows[0] as
      | (ExtractionMethodRecord & { found?: number })
      | undefined;
    if (!method || method.found === 0) return null;
    return this.parseJsonFields(method);
  }

  async delete(companyGuid: string, id: number): Promise<boolean> {
    const rows = await this.call<Array<{ affected: number }>>(
      companyGuid,
      'sp_extraction_methods_delete',
      [id],
    );
    return Number(rows[0]?.affected ?? 0) > 0;
  }

  private async call<TResult = ExtractionMethodRecord[]>(
    companyGuid: string,
    procedureName: string,
    parameters: unknown[] = [],
  ): Promise<TResult> {
    return this.companyDatabase.call<TResult>(
      companyGuid,
      procedureName,
      parameters as never[],
    );
  }

  private parseJsonFields(method: ExtractionMethodRecord): ExtractionMethodRecord {
    return {
      ...method,
      configurationSchema: this.parseJson(method.configurationSchema),
      parameters: this.parseJson(method.parameters),
      requests: this.parseJson(method.requests),
      equipment: this.parseJson(method.equipment),
      versions: this.parseJson(method.versions),
    };
  }

  private parseJson<T>(value: T | string): T {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
}