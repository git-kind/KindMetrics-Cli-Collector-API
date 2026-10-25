import { Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { DatabaseQueryParameter } from '../../infrastructure/database/database-connection';
import { LocalConnectionManager } from '../../infrastructure/database/local-connection.manager';
import { MySqlStoredProcedureExecutor } from '../../infrastructure/database/mysql-stored-procedure.executor';

@Injectable()
export class LocalStoredProcedureRepository {
  constructor(
    private readonly connections: LocalConnectionManager,
    private readonly executor: MySqlStoredProcedureExecutor,
  ) {}

  call<TResult>(
    procedureName: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.executor.call<TResult>(procedureName, parameters);
  }

  callIn<TResult>(
    connection: PoolConnection,
    procedureName: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.executor.callOn<TResult>(connection, procedureName, parameters);
  }

  withTransaction<TResult>(
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.connections.withTransaction(operation);
  }
}