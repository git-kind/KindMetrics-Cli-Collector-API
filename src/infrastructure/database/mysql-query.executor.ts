import { Injectable } from '@nestjs/common';
import { DatabaseQueryParameter } from './database-connection';
import { MysqlDatabaseConnection } from './mysql-database.connection';

@Injectable()
export class MySqlQueryExecutor {
  constructor(private readonly connection: MysqlDatabaseConnection) {}

  async execute<TResult>(
    sql: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    const [result] = await this.connection.getPool().execute(sql, parameters);
    return result as TResult;
  }
}