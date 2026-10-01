export type DatabaseQueryParameter =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Buffer
  | null;

export interface DatabaseConnection {
  execute<TResult>(
    sql: string,
    parameters?: DatabaseQueryParameter[],
  ): Promise<TResult>;
}

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');