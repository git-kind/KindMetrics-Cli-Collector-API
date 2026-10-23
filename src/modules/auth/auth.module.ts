import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../../Controllers/Auth/auth.controller';
import { AUTH_REPOSITORY } from '../../Repositories/Contracts/auth.repository';
import { MySqlAuthRepository } from '../../Repositories/StoredProcedures/mysql-auth.repository';
import { AuthService } from '../../Services/Auth/auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    MySqlAuthRepository,
    { provide: AUTH_REPOSITORY, useExisting: MySqlAuthRepository },
  ],
})
export class AuthModule {}