import { Injectable } from '@nestjs/common';
import { HealthRepository } from '../Contracts/health.repository';
import { MySqlQueryExecutor } from '../../infrastructure/database/mysql-query.executor';

@Injectable()
export class MySqlHealthRepository implements HealthRepository {
  constructor(private readonly queryExecutor: MySqlQueryExecutor) {}

  async canConnectToDatabase(): Promise<boolean> {
    const rows = await this.queryExecutor.execute<Array<{ connection: number }>>(
      'SELECT 1 AS connection',
    );
    return rows[0]?.connection === 1;
  }
}