import { Injectable } from '@nestjs/common';
import { LocalStoredProcedureRepository } from './local-stored-procedure.repository';
import {
  AuthRepository,
  UserCredentialRecord,
} from '../Contracts/auth.repository';

@Injectable()
export class MySqlAuthRepository implements AuthRepository {
  constructor(private readonly procedures: LocalStoredProcedureRepository) {}

  async findUserByEmail(email: string): Promise<UserCredentialRecord | null> {
    const rows = await this.procedures.call<UserCredentialRecord[]>(
      'sp_users_get_by_email',
      [email],
    );
    return rows[0] ?? null;
  }
}