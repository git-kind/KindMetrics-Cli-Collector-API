import { registerAs } from '@nestjs/config';

export default registerAs('environment', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));