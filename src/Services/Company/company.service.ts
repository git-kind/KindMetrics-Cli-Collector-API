import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../../Repositories/Contracts/company.repository';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companies: CompanyRepository,
  ) {}

  list() {
    return this.companies.list();
  }

  async get(guid: string) {
    const company = await this.companies.findByGuid(guid);
    if (!company) throw new NotFoundException('Company no encontrada.');
    return company;
  }

  async create(input: CreateCompanyInput) {
    try {
      return await this.companies.create(input);
    } catch (error) {
      if (this.isDuplicate(error)) {
        throw new ConflictException('El código de Company ya está registrado.');
      }
      throw error;
    }
  }

  async update(guid: string, input: UpdateCompanyInput) {
    try {
      const company = await this.companies.update(guid, input);
      if (!company) throw new NotFoundException('Company no encontrada.');
      return company;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (this.isDuplicate(error)) {
        throw new ConflictException('El código de Company ya está registrado.');
      }
      throw error;
    }
  }

  async delete(guid: string): Promise<{ deleted: true }> {
    try {
      const deleted = await this.companies.delete(guid);
      if (!deleted) throw new NotFoundException('Company no encontrada.');
      return { deleted: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (this.hasErrorCode(error, 'ER_ROW_IS_REFERENCED_2')) {
        throw new ConflictException(
          'No se puede eliminar la Company porque tiene registros asociados.',
        );
      }
      throw error;
    }
  }

  async createDatabase(guid: string) {
    try {
      const result = await this.companies.createDatabase(guid);
      if (!result) throw new NotFoundException('Company no encontrada.');
      return { ...result, created: Boolean(result.created) };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = this.getSqlMessage(error);
      if (message === 'COMPANY_NOT_FOUND') {
        throw new NotFoundException('Company no encontrada.');
      }
      if (message === 'COMPANY_DATABASE_MAPPING_CONFLICT') {
        throw new ConflictException(
          'La Company ya está asociada a otra base de datos.',
        );
      }
      if (message === 'COMPANY_DATABASE_ALREADY_EXISTS_UNMAPPED') {
        throw new ConflictException(
          'La base de datos derivada ya existe y no está asociada a esta Company.',
        );
      }
      if (message === 'INVALID_COMPANY_GUID') {
        throw new ConflictException('El GUID de Company no tiene un formato válido.');
      }
      if (this.hasErrorCode(error, 'ER_DB_CREATE_EXISTS')) {
        throw new ConflictException(
          'La base derivada ya existe, pero no está asociada a esta Company.',
        );
      }
      throw error;
    }
  }

  private isDuplicate(error: unknown): boolean {
    return this.hasErrorCode(error, 'ER_DUP_ENTRY');
  }

  private hasErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  private getSqlMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('sqlMessage' in error)) {
      return undefined;
    }
    return typeof error.sqlMessage === 'string' ? error.sqlMessage : undefined;
  }
}