import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  host: process.env.API_HOST ?? '127.0.0.1',
  port: Number(process.env.API_PORT ?? 3000),
}));