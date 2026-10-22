import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool } from 'mysql2/promise';

@Injectable()
export class MysqlDatabaseConnection
  implements OnApplicationShutdown
{
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = createPool({
      host: config.get<string>('database.host') ?? 'localhost',
      port: config.get<number>('database.port') ?? 3306,
      user: config.get<string>('database.user') ?? '',
      password: config.get<string>('database.password') ?? '',
      database: config.get<string>('database.database') ?? 'kindmetricscte',
      connectionLimit: config.get<number>('database.connectionLimit') ?? 10,
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}