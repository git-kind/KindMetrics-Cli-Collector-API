import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
}));