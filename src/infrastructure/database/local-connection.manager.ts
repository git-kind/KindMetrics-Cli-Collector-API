import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection } from 'mysql2/promise';
import { MysqlConnectionOptions } from './mysql-pool.types';

@Injectable()
export class LocalConnectionManager implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const options: MysqlConnectionOptions = {
      host: config.get<string>('database.host') ?? 'localhost',
      port: config.get<number>('database.port') ?? 3306,
      user: config.get<string>('database.user') ?? '',
      password: config.get<string>('database.password') ?? '',
      database: config.get<string>('database.database') ?? 'kindmetricscte',
      connectionLimit: config.get<number>('database.connectionLimit') ?? 10,
      connectTimeout: config.get<number>('database.connectTimeout') ?? 5000,
      queueLimit: config.get<number>('database.queueLimit') ?? 0,
    };
    this.pool = createPool({
      ...options,
      waitForConnections: true,
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async withConnection<TResult>(
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    const connection = await this.pool.getConnection();
    try {
      return await operation(connection);
    } finally {
      connection.release();
    }
  }

  async withTransaction<TResult>(
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const result = await operation(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}