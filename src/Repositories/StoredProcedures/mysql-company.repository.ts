import { Injectable } from '@nestjs/common';
import { LocalStoredProcedureRepository } from './local-stored-procedure.repository';
import {
  CompanyRecord,
  CompanyDatabaseCreation,
  CompanyRepository,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../Contracts/company.repository';

@Injectable()
export class MySqlCompanyRepository implements CompanyRepository {
  constructor(private readonly procedures: LocalStoredProcedureRepository) {}

  list(): Promise<CompanyRecord[]> {
    return this.procedures.call('sp_companies_list');
  }

  async findByGuid(guid: string): Promise<CompanyRecord | null> {
    const rows = await this.procedures.call<CompanyRecord[]>(
      'sp_companies_get_by_guid',
      [guid],
    );
    return rows[0] ?? null;
  }

  async create(input: CreateCompanyInput): Promise<CompanyRecord> {
    const rows = await this.procedures.call<CompanyRecord[]>(
      'sp_companies_create',
      [
        input.name,
        input.shortName,
        input.code,
        input.timezone,
        input.locale,
        input.status,
        input.configJson === undefined ? null : JSON.stringify(input.configJson),
      ],
    );
    return rows[0];
  }

  async update(
    guid: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord | null> {
    const fields = [
      ['name', input.name],
      ['shortName', input.shortName],
      ['code', input.code],
      ['timezone', input.timezone],
      ['locale', input.locale],
      ['status', input.status],
      ['configJson', input.configJson],
    ] as const;
    const values: unknown[] = [guid];

    for (const [, value] of fields) {
      values.push(
        value === undefined
          ? null
          : typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : value,
        value !== undefined,
      );
    }

    const rows = await this.procedures.call<Array<CompanyRecord | { guid: null }>>(
      'sp_companies_update',
      values as never[],
    );
    const company = rows[0];
    return company && company.guid ? (company as CompanyRecord) : null;
  }

  async delete(guid: string): Promise<boolean> {
    const rows = await this.procedures.call<Array<{ affected: number }>>(
      'sp_companies_delete',
      [guid],
    );
    return Number(rows[0]?.affected ?? 0) > 0;
  }

  async createDatabase(guid: string): Promise<CompanyDatabaseCreation | null> {
    const rows = await this.procedures.call<CompanyDatabaseCreation[]>(
      'sp_companies_create_database',
      [guid],
    );
    return rows[0] ?? null;
  }
}