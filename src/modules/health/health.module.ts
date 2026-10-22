import { Module } from '@nestjs/common';
import { HealthController } from '../../Controllers/Health/health.controller';
import { HEALTH_REPOSITORY } from '../../Repositories/Contracts/health.repository';
import { MySqlHealthRepository } from '../../Repositories/Queries/mysql-health.repository';
import { HealthService } from '../../Services/Health/health.service';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    MySqlHealthRepository,
    { provide: HEALTH_REPOSITORY, useExisting: MySqlHealthRepository },
  ],
})
export class HealthModule {}