import {
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection } from 'mysql2/promise';

interface ManagedPool {
  pool: Pool;
  activeOperations: number;
  lastUsedAt: number;
}

@Injectable()
export class CompanyConnectionManager implements OnApplicationShutdown {
  private readonly pools = new Map<string, ManagedPool>();
  private readonly maxPools: number;
  private readonly idleTimeoutMs: number;
  private readonly cleanupTimer: NodeJS.Timeout;
  private poolCreationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly config: ConfigService) {
    this.maxPools = Math.max(
      1,
      config.get<number>('database.companyPoolMax') ?? 20,
    );
    this.idleTimeoutMs = Math.max(
      1000,
      config.get<number>('database.companyPoolIdleTimeoutMs') ?? 300000,
    );
    this.cleanupTimer = setInterval(() => this.closeIdlePools(), 60000);
    this.cleanupTimer.unref();
  }

  async withConnection<TResult>(
    databaseName: string,
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    const managed = await this.acquire(databaseName);
    let connection: PoolConnection | undefined;
    try {
      connection = await managed.pool.getConnection();
      return await operation(connection);
    } finally {
      connection?.release();
      managed.activeOperations -= 1;
      managed.lastUsedAt = Date.now();
    }
  }

  async withTransaction<TResult>(
    databaseName: string,
    operation: (connection: PoolConnection) => Promise<TResult>,
  ): Promise<TResult> {
    return this.withConnection(databaseName, async (connection) => {
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
    clearInterval(this.cleanupTimer);
    const pools = [...this.pools.values()];
    this.pools.clear();
    await Promise.all(pools.map(({ pool }) => pool.end()));
  }

  private async acquire(databaseName: string): Promise<ManagedPool> {
    if (!/^km_company_[a-f0-9]{32}$/i.test(databaseName)) {
      throw new ServiceUnavailableException('La base de datos de Company no es válida.');
    }

    let managed = this.pools.get(databaseName);
    if (!managed) managed = await this.createPool(databaseName);
    managed.activeOperations += 1;
    managed.lastUsedAt = Date.now();
    return managed;
  }

  private async createPool(databaseName: string): Promise<ManagedPool> {
    const previousCreation = this.poolCreationQueue;
    let releaseCreation!: () => void;
    this.poolCreationQueue = new Promise<void>((resolve) => {
      releaseCreation = resolve;
    });
    await previousCreation;

    try {
      const existingPool = this.pools.get(databaseName);
      if (existingPool) return existingPool;

      this.closeIdlePools();
      if (this.pools.size >= this.maxPools) {
        const idlePool = [...this.pools.entries()]
          .filter(([, entry]) => entry.activeOperations === 0)
          .sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0];
        if (!idlePool) {
          throw new ServiceUnavailableException(
            'Se alcanzó el límite de conexiones de bases Company.',
          );
        }
        this.pools.delete(idlePool[0]);
        await idlePool[1].pool.end();
      }

      const managed: ManagedPool = {
        pool: createPool({
          host: this.config.get<string>('database.host') ?? 'localhost',
          port: this.config.get<number>('database.port') ?? 3306,
          user: this.config.get<string>('database.user') ?? '',
          password: this.config.get<string>('database.password') ?? '',
          database: databaseName,
          connectionLimit:
            this.config.get<number>('database.companyConnectionLimit') ?? 5,
          connectTimeout: this.config.get<number>('database.connectTimeout') ?? 5000,
          waitForConnections: true,
          queueLimit: this.config.get<number>('database.queueLimit') ?? 0,
        }),
        activeOperations: 0,
        lastUsedAt: Date.now(),
      };
      this.pools.set(databaseName, managed);
      return managed;
    } finally {
      releaseCreation();
    }
  }

  private closeIdlePools(): void {
    const expiredBefore = Date.now() - this.idleTimeoutMs;
    for (const [key, managed] of this.pools) {
      if (
        managed.activeOperations === 0 &&
        managed.lastUsedAt <= expiredBefore
      ) {
        this.pools.delete(key);
        void managed.pool.end().catch(() => undefined);
      }
    }
  }
}