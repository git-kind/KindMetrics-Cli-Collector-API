import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection';
import { MysqlDatabaseConnection } from './mysql-database.connection';

@Global()
@Module({
  providers: [
    MysqlDatabaseConnection,
    {
      provide: DATABASE_CONNECTION,
      useExisting: MysqlDatabaseConnection,
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}