import { Pool, PoolConnection } from 'mysql2/promise';

export type MysqlExecutorConnection = Pool | PoolConnection;

export interface MysqlConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  connectTimeout: number;
  queueLimit: number;
}