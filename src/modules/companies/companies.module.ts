import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompanyController } from '../../Controllers/Company/company.controller';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { COMPANY_REPOSITORY } from '../../Repositories/Contracts/company.repository';
import { MySqlCompanyRepository } from '../../Repositories/StoredProcedures/mysql-company.repository';
import { CompanyService } from '../../Services/Company/company.service';

@Module({
  imports: [AuthModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    MySqlCompanyRepository,
    { provide: COMPANY_REPOSITORY, useExisting: MySqlCompanyRepository },
    PlatformAdminGuard,
  ],
})
export class CompaniesModule {}