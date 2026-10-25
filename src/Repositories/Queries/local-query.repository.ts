import { Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { DatabaseQueryParameter } from '../../infrastructure/database/database-connection';
import { LocalConnectionManager } from '../../infrastructure/database/local-connection.manager';
import { MySqlQueryExecutor } from '../../infrastructure/database/mysql-query.executor';

@Injectable()
export class LocalQueryRepository {
  constructor(
    private readonly connections: LocalConnectionManager,
    private readonly executor: MySqlQueryExecutor,
  ) {}

  execute<TResult>(
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.executor.execute<TResult>(sql, parameters);
  }

  executeIn<TResult>(
    connection: PoolConnection,
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.executor.executeOn<TResult>(connection, sql, parameters);
  }

  withTransaction<TResult>(
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.connections.withTransaction(operation);
  }
}