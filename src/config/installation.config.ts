import { registerAs } from '@nestjs/config';

export default registerAs('installation', () => ({
  configPath: process.env.KINDMETRICS_INSTALLATION_CONFIG_PATH ?? 'kindCli.cfg',
}));