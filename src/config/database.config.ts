import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE ?? 'kindmetricscte',
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT ?? 5000),
  queueLimit: Number(process.env.MYSQL_QUEUE_LIMIT ?? 0),
  companyPoolMax: Number(process.env.MYSQL_COMPANY_POOL_MAX ?? 20),
  companyPoolIdleTimeoutMs: Number(
    process.env.MYSQL_COMPANY_POOL_IDLE_TIMEOUT_MS ?? 300000,
  ),
  companyConnectionLimit: Number(
    process.env.MYSQL_COMPANY_CONNECTION_LIMIT ?? 5,
  ),
}));