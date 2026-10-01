import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import apiConfig from './config/api.config';
import databaseConfig from './config/database.config';
import environmentConfig from './config/environment.config';
import installationConfig from './config/installation.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        apiConfig,
        databaseConfig,
        installationConfig,
        environmentConfig,
      ],
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}