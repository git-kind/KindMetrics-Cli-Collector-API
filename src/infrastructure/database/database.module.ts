import { Global, Module } from '@nestjs/common';
import { MysqlDatabaseConnection } from './mysql-database.connection';
import { MySqlQueryExecutor } from './mysql-query.executor';
import { MySqlStoredProcedureExecutor } from './mysql-stored-procedure.executor';

@Global()
@Module({
  providers: [
    MysqlDatabaseConnection,
    MySqlQueryExecutor,
    MySqlStoredProcedureExecutor,
  ],
  exports: [MySqlQueryExecutor, MySqlStoredProcedureExecutor],
})
export class DatabaseModule {}