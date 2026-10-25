import { Global, Module } from '@nestjs/common';
import { CompanyDatabaseResolver } from '../../common/company-context/company-database.resolver';
import { CompanyContextGuard } from '../../common/company-context/company-context.guard';
import { CompanyConnectionManager } from './company-connection.manager';
import { CompanyDatabaseRepository } from './company-database.repository';
import { LocalConnectionManager } from './local-connection.manager';
import { MySqlQueryExecutor } from './mysql-query.executor';
import { MySqlStoredProcedureExecutor } from './mysql-stored-procedure.executor';
import { LocalQueryRepository } from '../../Repositories/Queries/local-query.repository';
import { LocalStoredProcedureRepository } from '../../Repositories/StoredProcedures/local-stored-procedure.repository';
import { COMPANY_CONTEXT_REPOSITORY } from '../../Repositories/Contracts/company-context.repository';
import { MySqlCompanyContextRepository } from '../../Repositories/Queries/mysql-company-context.repository';

@Global()
@Module({
  providers: [
    LocalConnectionManager,
    CompanyConnectionManager,
    MySqlQueryExecutor,
    MySqlStoredProcedureExecutor,
    LocalQueryRepository,
    LocalStoredProcedureRepository,
    MySqlCompanyContextRepository,
    {
      provide: COMPANY_CONTEXT_REPOSITORY,
      useExisting: MySqlCompanyContextRepository,
    },
    CompanyDatabaseResolver,
    CompanyContextGuard,
    CompanyDatabaseRepository,
  ],
  exports: [
    LocalConnectionManager,
    CompanyConnectionManager,
    MySqlQueryExecutor,
    MySqlStoredProcedureExecutor,
    LocalQueryRepository,
    LocalStoredProcedureRepository,
    COMPANY_CONTEXT_REPOSITORY,
    CompanyDatabaseResolver,
    CompanyContextGuard,
    CompanyDatabaseRepository,
  ],
})
export class DatabaseModule {}