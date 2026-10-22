import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE ?? 'kindmetricscte',
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
}));