import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyContext } from '../../common/company-context/company-context';
import {
  CreateServiceInput,
  ServiceFilters,
  UpdateServiceInput,
} from '../../Models/Services/service.dto';
import {
  SERVICE_REPOSITORY,
  ServiceRecord,
  ServiceRepository,
} from '../../Repositories/Contracts/service.repository';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
  ) {}

  list(company: CompanyContext, filters: ServiceFilters) {
    return this.services.list(company.companyGuid, filters);
  }

  async get(company: CompanyContext, id: number) {
    return this.requireService(await this.services.get(company.companyGuid, id));
  }

  async create(company: CompanyContext, input: CreateServiceInput) {
    return this.translateErrors(() =>
      this.services.create(company.companyGuid, input, company.userGuid),
    );
  }

  async update(company: CompanyContext, id: number, input: UpdateServiceInput) {
    return this.translateErrors(async () =>
      this.requireService(
        await this.services.update(company.companyGuid, id, input, company.userGuid),
      ),
    );
  }

  async duplicate(company: CompanyContext, id: number, code: string, name: string) {
    return this.translateErrors(async () =>
      this.requireService(
        await this.services.duplicate(company.companyGuid, id, code, name, company.userGuid),
      ),
    );
  }

  async setStatus(company: CompanyContext, id: number, isActive: boolean) {
    return this.requireService(
      await this.services.setStatus(company.companyGuid, id, isActive, company.userGuid),
    );
  }

  async delete(company: CompanyContext, id: number) {
    return this.translateErrors(async () => {
      if (!(await this.services.delete(company.companyGuid, id))) {
        throw new NotFoundException('Servicio no encontrado.');
      }
      return { deleted: true as const };
    });
  }

  async usage(company: CompanyContext, id: number) {
    const usage = await this.services.usage(company.companyGuid, id);
    if (!usage) throw new NotFoundException('Servicio no encontrado.');
    return usage;
  }

  listTypes(company: CompanyContext) {
    return this.services.listTypes(company.companyGuid);
  }

  listDrivers(company: CompanyContext, serviceTypeId?: number) {
    return this.services.listDrivers(company.companyGuid, serviceTypeId);
  }

  listAuthTypes(company: CompanyContext, driverKey?: string) {
    return this.services.listAuthTypes(company.companyGuid, driverKey);
  }

  async getConnection(company: CompanyContext, id: number) {
    await this.get(company, id);
    return this.services.getConnection(company.companyGuid, id);
  }

  async upsertConnection(company: CompanyContext, id: number, input: Parameters<ServiceRepository['upsertConnection']>[2]) {
    await this.get(company, id);
    return this.translateErrors(() =>
      this.services.upsertConnection(company.companyGuid, id, input, company.userGuid),
    );
  }

  async listCredentials(company: CompanyContext, id: number) {
    await this.get(company, id);
    return this.services.listCredentials(company.companyGuid, id);
  }

  async upsertCredential(company: CompanyContext, id: number, input: Parameters<ServiceRepository['upsertCredential']>[2]) {
    await this.get(company, id);
    return this.translateErrors(() =>
      this.services.upsertCredential(company.companyGuid, id, input),
    );
  }

  deleteCredential(company: CompanyContext, credentialId: number) {
    return this.services.deleteCredential(company.companyGuid, credentialId).then((deleted) => {
      if (!deleted) throw new NotFoundException('Referencia de credencial no encontrada.');
      return { deleted: true as const };
    });
  }

  async listVersions(company: CompanyContext, id: number) {
    await this.get(company, id);
    return this.services.listVersions(company.companyGuid, id);
  }

  async getVersion(company: CompanyContext, id: number, version: number) {
    const result = await this.services.getVersion(company.companyGuid, id, version);
    if (!result) throw new NotFoundException('Versión del servicio no encontrada.');
    return result;
  }

  async testConnection(company: CompanyContext, id: number) {
    const service = await this.get(company, id);
    if (service.driverStatus !== 'INSTALLED') {
      return {
        status: 'NOT_SUPPORTED' as const,
        message: 'El driver del servicio no está instalado y autorizado.',
      };
    }
    return {
      status: 'NOT_SUPPORTED' as const,
      message: 'No hay una implementación de prueba de conexión registrada para este driver.',
    };
  }

  private requireService(service: ServiceRecord | null): ServiceRecord {
    if (!service) throw new NotFoundException('Servicio no encontrado.');
    return service;
  }

  private async translateErrors<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      return await operation();
    } catch (error) {
      const code = this.mysqlCode(error);
      const message = this.mysqlMessage(error);
      if (code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El código o nombre del servicio ya está registrado.');
      }
      if (message === 'SERVICE_TYPE_DRIVER_NOT_AVAILABLE') {
        throw new ConflictException('El driver no está asociado al tipo de servicio seleccionado.');
      }
      if (message === 'SERVICE_AUTH_TYPE_NOT_SUPPORTED') {
        throw new ConflictException('El tipo de autenticación no está habilitado para este driver.');
      }
      if (message === 'SERVICE_HAS_CREDENTIAL_REFERENCES') {
        throw new ConflictException('Elimine las referencias de credenciales antes de borrar el servicio.');
      }
      if (message === 'SERVICE_HAS_COLLECTORS') {
        throw new ConflictException('No se puede eliminar el Servicio porque tiene Collectors asociados.');
      }
      if (message === 'SERVICE_NOT_FOUND') {
        throw new NotFoundException('Servicio no encontrado.');
      }
      throw error;
    }
  }

  private mysqlCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
      return error.code;
    }
    return undefined;
  }

  private mysqlMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('sqlMessage' in error && typeof error.sqlMessage === 'string') {
      return error.sqlMessage;
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    return undefined;
  }
}
