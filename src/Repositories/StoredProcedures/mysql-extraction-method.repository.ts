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
    return this.call(companyGuid, 'sp_extraction_methods_list');
  }

  async findById(companyGuid: string, id: string): Promise<ExtractionMethodRecord | null> {
    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_get',
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    companyGuid: string,
    input: CreateExtractionMethodInput,
  ): Promise<ExtractionMethodRecord> {
    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_create',
      [
        input.name,
        input.type,
        input.target ?? null,
        JSON.stringify(input.connection),
        input.credentials == null ? null : JSON.stringify(input.credentials),
        input.discovery == null ? null : JSON.stringify(input.discovery),
        input.availableData == null ? null : JSON.stringify(input.availableData),
        input.capabilities == null ? null : JSON.stringify(input.capabilities),
        input.status,
      ],
    );
    return rows[0];
  }

  async update(
    companyGuid: string,
    id: string,
    input: UpdateExtractionMethodInput,
  ): Promise<ExtractionMethodRecord | null> {
    const fields = [
      ['name', input.name],
      ['type', input.type],
      ['target', input.target],
      ['connection', input.connection],
      ['credentials', input.credentials],
      ['discovery', input.discovery],
      ['availableData', input.availableData],
      ['capabilities', input.capabilities],
      ['status', input.status],
    ] as const;
    const values: unknown[] = [id];

    for (const [field, value] of fields) {
      const isJson = [
        'connection',
        'credentials',
        'discovery',
        'availableData',
        'capabilities',
      ].includes(field);
      values.push(
        value === undefined
          ? null
          : isJson && value !== null
            ? JSON.stringify(value)
            : value,
        value !== undefined,
      );
    }

    const rows = await this.call<ExtractionMethodRecord[]>(
      companyGuid,
      'sp_extraction_methods_update',
      values,
    );
    return rows[0] ?? null;
  }

  async delete(companyGuid: string, id: string): Promise<boolean> {
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
}