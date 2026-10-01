import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  port: Number(process.env.API_PORT ?? 3000),
}));