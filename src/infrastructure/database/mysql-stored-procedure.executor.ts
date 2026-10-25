import { Injectable } from '@nestjs/common';
import { DatabaseQueryParameter } from './database-connection';
import { MysqlExecutorConnection } from './mysql-pool.types';
import { LocalConnectionManager } from './local-connection.manager';

@Injectable()
export class MySqlStoredProcedureExecutor {
  constructor(private readonly connection: LocalConnectionManager) {}

  async call<TResult>(
    procedureName: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(procedureName)) {
      throw new Error('Invalid stored procedure identifier.');
    }

    return this.callOn<TResult>(
      this.connection.getPool(),
      procedureName,
      parameters,
    );
  }

  async callOn<TResult>(
    connection: MysqlExecutorConnection,
    procedureName: string,
    parameters: DatabaseQueryParameter[] = [],
  ): Promise<TResult> {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(procedureName)) {
      throw new Error('Invalid stored procedure identifier.');
    }
    const placeholders = parameters.map(() => '?').join(', ');
    const statement = `CALL \`${procedureName}\`(${placeholders})`;
    const [result] = await connection.query(statement, parameters);

    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0] as TResult;
    }

    return result as TResult;
  }
}