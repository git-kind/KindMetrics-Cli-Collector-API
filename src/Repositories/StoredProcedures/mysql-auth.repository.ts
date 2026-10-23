import { Injectable } from '@nestjs/common';
import { MySqlStoredProcedureExecutor } from '../../infrastructure/database/mysql-stored-procedure.executor';
import {
  AuthRepository,
  UserCredentialRecord,
} from '../Contracts/auth.repository';

@Injectable()
export class MySqlAuthRepository implements AuthRepository {
  constructor(private readonly procedures: MySqlStoredProcedureExecutor) {}

  async findUserByEmail(email: string): Promise<UserCredentialRecord | null> {
    const rows = await this.procedures.call<UserCredentialRecord[]>(
      'sp_users_get_by_email',
      [email],
    );
    return rows[0] ?? null;
  }
}