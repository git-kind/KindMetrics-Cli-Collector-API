export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface UserCredentialRecord {
  guid: string;
  email: string;
  name: string;
  password_hash: string;
  status: string;
  is_platform_admin: number | boolean;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserCredentialRecord | null>;
}