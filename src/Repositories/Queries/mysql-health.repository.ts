import { Injectable } from '@nestjs/common';
import { HealthRepository } from '../Contracts/health.repository';
import { LocalQueryRepository } from './local-query.repository';

@Injectable()
export class MySqlHealthRepository implements HealthRepository {
  constructor(private readonly queryExecutor: LocalQueryRepository) {}

  async canConnectToDatabase(): Promise<boolean> {
    const rows = await this.queryExecutor.execute<Array<{ connection: number }>>(
      'SELECT 1 AS connection',
    );
    return rows[0]?.connection === 1;
  }
}