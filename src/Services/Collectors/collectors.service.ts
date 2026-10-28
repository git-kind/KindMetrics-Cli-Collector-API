import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyContext } from '../../common/company-context/company-context';
import {
  CollectorConfiguration,
  CollectorExecutionFilters,
  CollectorFilters,
  CreateCollectorInput,
  UpdateCollectorInput,
} from '../../Models/Collectors/collector.dto';
import {
  COLLECTOR_REPOSITORY,
  CollectorRepository,
  CollectorRow,
} from '../../Repositories/Contracts/collector.repository';

@Injectable()
export class CollectorsService {
  constructor(
    @Inject(COLLECTOR_REPOSITORY) private readonly collectors: CollectorRepository,
  ) {}

  list(company: CompanyContext, filters: CollectorFilters) {
    return this.collectors.list(company.companyGuid, filters);
  }

  async get(company: CompanyContext, id: number) {
    return this.requireCollector(await this.collectors.get(company.companyGuid, id));
  }

  async create(company: CompanyContext, input: CreateCollectorInput) {
    return this.translateErrors(() =>
      this.collectors.create(company.companyGuid, input, company.userGuid),
    );
  }

  async update(company: CompanyContext, id: number, input: UpdateCollectorInput) {
    return this.translateErrors(async () =>
      this.requireCollector(await this.collectors.update(company.companyGuid, id, input, company.userGuid)),
    );
  }

  async duplicate(company: CompanyContext, id: number, code: string, name: string) {
    return this.translateErrors(async () =>
      this.requireCollector(await this.collectors.duplicate(company.companyGuid, id, code, name, company.userGuid)),
    );
  }

  async setStatus(company: CompanyContext, id: number, status: string) {
    return this.translateErrors(async () =>
      this.requireCollector(await this.collectors.setStatus(company.companyGuid, id, status, company.userGuid)),
    );
  }

  async delete(company: CompanyContext, id: number) {
    return this.translateErrors(async () => {
      if (!(await this.collectors.delete(company.companyGuid, id))) {
        throw new NotFoundException('Collector no encontrado.');
      }
      return { deleted: true as const };
    });
  }

  async getConfiguration(company: CompanyContext, id: number) {
    await this.get(company, id);
    const result = await this.collectors.getConfiguration(company.companyGuid, id);
    if (!result) throw new NotFoundException('Configuración del Collector no encontrada.');
    return result;
  }

  async saveConfiguration(company: CompanyContext, id: number, configuration: CollectorConfiguration) {
    await this.get(company, id);
    return this.translateErrors(async () => {
      const result = await this.collectors.saveConfiguration(company.companyGuid, id, configuration, company.userGuid);
      if (!result) throw new NotFoundException('Collector no encontrado.');
      return result;
    });
  }

  async validate(company: CompanyContext, id: number) {
    const collector = await this.get(company, id);
    const configuration = await this.getConfiguration(company, id);
    try {
      await this.collectors.validate(company.companyGuid, id);
    } catch (error) {
      throw this.translateDatabaseError(error);
    }
    return {
      valid: true as const,
      serviceId: collector.serviceId,
      methodCount: Array.isArray((configuration.configuration as CollectorConfiguration | undefined)?.methods)
        ? ((configuration.configuration as CollectorConfiguration).methods.length)
        : 0,
    };
  }

  async enqueue(company: CompanyContext, id: number, triggerType: string) {
    const collector = await this.get(company, id);
    if (collector.status !== 'ACTIVE') {
      throw new ConflictException('Solo se pueden encolar Collectors con estado ACTIVE.');
    }
    return this.translateErrors(() =>
      this.collectors.enqueue(company.companyGuid, id, triggerType, company.userGuid),
    );
  }

  async listExecutions(company: CompanyContext, id: number, filters: CollectorExecutionFilters) {
    await this.get(company, id);
    return this.collectors.listExecutions(company.companyGuid, id, filters);
  }

  async getExecution(company: CompanyContext, id: number, executionId: number) {
    await this.get(company, id);
    const execution = await this.collectors.getExecution(company.companyGuid, id, executionId);
    if (!execution) throw new NotFoundException('Ejecución del Collector no encontrada.');
    return execution;
  }

  async health(company: CompanyContext, id: number) {
    await this.get(company, id);
    const health = await this.collectors.health(company.companyGuid, id);
    if (!health) throw new NotFoundException('Collector no encontrado.');
    return health;
  }

  async listVersions(company: CompanyContext, id: number) {
    await this.get(company, id);
    return this.collectors.listVersions(company.companyGuid, id);
  }

  async getVersion(company: CompanyContext, id: number, version: number) {
    const result = await this.collectors.getVersion(company.companyGuid, id, version);
    if (!result) throw new NotFoundException('Versión del Collector no encontrada.');
    return result;
  }

  async getByService(company: CompanyContext, serviceId: number, filters: CollectorExecutionFilters) {
    return this.collectors.getByService(company.companyGuid, serviceId, filters);
  }

  private requireCollector(collector: CollectorRow | null): CollectorRow {
    if (!collector) throw new NotFoundException('Collector no encontrado.');
    return collector;
  }

  private async translateErrors<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      return await operation();
    } catch (error) {
      throw this.translateDatabaseError(error);
    }
  }

  private translateDatabaseError(error: unknown): Error {
    const message = this.mysqlMessage(error);
    const code = this.mysqlCode(error);
    if (code === 'ER_DUP_ENTRY') return new ConflictException('El código del Collector o una configuración ya existe.');
    if (message === 'COLLECTOR_SERVICE_NOT_FOUND_OR_INACTIVE') return new NotFoundException('El Servicio no existe o está inactivo en esta Company.');
    if (message === 'COLLECTOR_METHOD_INVALID_OR_INCOMPATIBLE') return new BadRequestException('Uno o más Métodos de Extracción son inexistentes, inactivos, inválidos o incompatibles con el driver del Servicio.');
    if (message === 'COLLECTOR_HAS_ACTIVE_EXECUTIONS') return new ConflictException('No se puede cambiar el Servicio o eliminar el Collector mientras tenga ejecuciones activas.');
    if (message === 'COLLECTOR_HAS_CREDENTIAL_REFERENCES') return new ConflictException('El Collector tiene dependencias que impiden eliminarlo.');
    if (message === 'COLLECTOR_EXECUTION_OVERLAP') return new ConflictException('Ya existe una ejecución encolada o activa para este Collector.');
    if (message === 'COLLECTOR_NOT_ACTIVE') return new ConflictException('El Collector no está activo y no puede encolarse.');
    if (message === 'COLLECTOR_NOT_FOUND') return new NotFoundException('Collector no encontrado.');
    return error instanceof Error ? error : new Error('Error de persistencia del Collector.');
  }

  private mysqlCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
      return error.code;
    }
    return undefined;
  }

  private mysqlMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('sqlMessage' in error && typeof error.sqlMessage === 'string') return error.sqlMessage;
    if ('message' in error && typeof error.message === 'string') return error.message;
    return undefined;
  }
}
