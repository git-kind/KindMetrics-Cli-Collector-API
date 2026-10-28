import { Module } from '@nestjs/common';
import { ServicesController } from '../../Controllers/Services/services.controller';
import { SERVICE_REPOSITORY } from '../../Repositories/Contracts/service.repository';
import { MySqlServiceRepository } from '../../Repositories/StoredProcedures/mysql-service.repository';
import { ServicesService } from '../../Services/Services/services.service';
import { ServiceRolesGuard } from '../../common/guards/service-roles.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    MySqlServiceRepository,
    ServiceRolesGuard,
    {
      provide: SERVICE_REPOSITORY,
      useExisting: MySqlServiceRepository,
    },
  ],
})
export class ServicesModule {}
