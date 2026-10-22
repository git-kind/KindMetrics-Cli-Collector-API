import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppLogger } from './common/logging/app-logger.service';
import apiConfig from './config/api.config';
import databaseConfig from './config/database.config';
import environmentConfig from './config/environment.config';
import installationConfig from './config/installation.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { QueriesModule } from './modules/queries/queries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.prod'
          : process.env.NODE_ENV === 'qa'
            ? '.env.qa'
            : '.env.dev',
      load: [
        apiConfig,
        databaseConfig,
        installationConfig,
        environmentConfig,
      ],
    }),
    DatabaseModule,
    HealthModule,
    QueriesModule,
  ],
  providers: [AppLogger],
})
export class AppModule {}