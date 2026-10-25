import { Injectable } from '@nestjs/common';
import { DatabaseQueryParameter } from './database-connection';
import { MysqlExecutorConnection } from './mysql-pool.types';
import { LocalConnectionManager } from './local-connection.manager';

@Injectable()
export class MySqlQueryExecutor {
  constructor(private readonly connection: LocalConnectionManager) {}

  async execute<TResult>(
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    return this.executeOn<TResult>(this.connection.getPool(), sql, parameters);
  }

  async executeOn<TResult>(
    connection: MysqlExecutorConnection,
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    const [result] = await connection.execute(sql, parameters);
    return result as TResult;
  }
}