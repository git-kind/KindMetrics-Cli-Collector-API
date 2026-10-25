import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseQueryParameter } from './database-connection';
import { CompanyConnectionManager } from './company-connection.manager';
import { MySqlQueryExecutor } from './mysql-query.executor';
import { MySqlStoredProcedureExecutor } from './mysql-stored-procedure.executor';
import {
  COMPANY_CONTEXT_REPOSITORY,
  CompanyContextRepository,
} from '../../Repositories/Contracts/company-context.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class CompanyDatabaseRepository {
  constructor(
    private readonly connections: CompanyConnectionManager,
    private readonly queries: MySqlQueryExecutor,
    private readonly procedures: MySqlStoredProcedureExecutor,
    @Inject(COMPANY_CONTEXT_REPOSITORY)
    private readonly companyMappings: CompanyContextRepository,
  ) {}

  execute<TResult>(
    companyGuid: string,
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.withCompanyConnection(companyGuid, (connection) =>
      this.queries.executeOn<TResult>(connection, sql, parameters),
    );
  }

  call<TResult>(
    companyGuid: string,
    procedureName: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.withCompanyConnection(companyGuid, (connection) =>
      this.procedures.callOn<TResult>(connection, procedureName, parameters),
    );
  }

  withTransaction<TResult>(
    companyGuid: string,
    operation: (connection: import('mysql2/promise').PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.withCompanyDatabase(companyGuid, (databaseName) =>
      this.connections.withTransaction(databaseName, operation),
    );
  }

  private withCompanyConnection<TResult>(
    companyGuid: string,
    operation: (connection: import('mysql2/promise').PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.withCompanyDatabase(companyGuid, (databaseName) =>
      this.connections.withConnection(databaseName, operation),
    );
  }

  private async withCompanyDatabase<TResult>(
    companyGuid: string,
    operation: (databaseName: string) => Promise<TResult>,
  ): Promise<TResult> {
    const databaseName =
      await this.companyMappings.findActiveCompanyDatabaseName(companyGuid);
    if (!databaseName) {
      throw new NotFoundException('Company no encontrada o sin base de datos asignada.');
    }

    const expectedDatabaseName = `km_company_${companyGuid.replace(/-/g, '')}`;
    if (
      !/^km_company_[a-f0-9]{32}$/i.test(databaseName) ||
      databaseName.toLowerCase() !== expectedDatabaseName.toLowerCase()
    ) {
      throw new ConflictException('La base de datos asignada a la Company no es válida.');
    }

    return operation(databaseName);
  }
}