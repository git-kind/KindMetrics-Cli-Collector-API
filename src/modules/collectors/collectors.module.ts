import { Module } from '@nestjs/common';
import { CollectorsController } from '../../Controllers/Collectors/collectors.controller';
import { COLLECTOR_REPOSITORY } from '../../Repositories/Contracts/collector.repository';
import { MySqlCollectorRepository } from '../../Repositories/StoredProcedures/mysql-collector.repository';
import { CollectorsService } from '../../Services/Collectors/collectors.service';
import { ServiceRolesGuard } from '../../common/guards/service-roles.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CollectorsController],
  providers: [
    CollectorsService,
    MySqlCollectorRepository,
    ServiceRolesGuard,
    {
      provide: COLLECTOR_REPOSITORY,
      useExisting: MySqlCollectorRepository,
    },
  ],
})
export class CollectorsModule {}
