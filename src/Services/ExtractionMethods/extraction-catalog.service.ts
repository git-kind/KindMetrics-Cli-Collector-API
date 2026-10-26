import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateConnectorInput,
  CreateProviderInput,
  ExtractionCatalogFilters,
  EXTRACTION_CATALOG_REPOSITORY,
  ExtractionCatalogRepository,
  UpdateConnectorInput,
  UpdateProviderInput,
} from '../../Repositories/Contracts/extraction-catalog.repository';

@Injectable()
export class ExtractionCatalogService {
  constructor(
    @Inject(EXTRACTION_CATALOG_REPOSITORY)
    private readonly catalog: ExtractionCatalogRepository,
  ) {}

  listProviders(filters: ExtractionCatalogFilters) { return this.catalog.listProviders(filters); }
  listConnectors(filters: ExtractionCatalogFilters) { return this.catalog.listConnectors(filters); }

  async getProvider(id: number) {
    const row = await this.catalog.getProvider(id);
    if (!row) throw new NotFoundException('Proveedor de extracción no encontrado.');
    return row;
  }

  async getConnector(id: number) {
    const row = await this.catalog.getConnector(id);
    if (!row) throw new NotFoundException('Conector de extracción no encontrado.');
    return row;
  }

  createProvider(input: CreateProviderInput) { return this.translateConflicts(() => this.catalog.createProvider(input)); }
  createConnector(input: CreateConnectorInput) { return this.translateConflicts(() => this.catalog.createConnector(input)); }

  async updateProvider(id: number, input: UpdateProviderInput) {
    return this.translateConflicts(async () => {
      const row = await this.catalog.updateProvider(id, input);
      if (!row) throw new NotFoundException('Proveedor de extracción no encontrado.');
      return row;
    });
  }

  async updateConnector(id: number, input: UpdateConnectorInput) {
    return this.translateConflicts(async () => {
      const row = await this.catalog.updateConnector(id, input);
      if (!row) throw new NotFoundException('Conector de extracción no encontrado.');
      return row;
    });
  }

  async deleteProvider(id: number) {
    return this.deleteResult(await this.translateConflicts(() => this.catalog.deleteProvider(id)), 'Proveedor');
  }

  async deleteConnector(id: number) {
    return this.deleteResult(await this.translateConflicts(() => this.catalog.deleteConnector(id)), 'Conector');
  }

  private deleteResult(deleted: boolean, entity: string) {
    if (!deleted) throw new NotFoundException(`${entity} de extracción no encontrado.`);
    return { deleted: true as const };
  }

  private async translateConflicts<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    try {
      return await operation();
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_DUP_ENTRY') {
        throw new ConflictException('El código o clave ya está registrado.');
      }
      if (this.mysqlCode(error) === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException('No se puede eliminar el registro porque tiene dependencias.');
      }
      if (this.mysqlMessage(error) === 'PROVIDER_HAS_ACTIVE_CONNECTORS') {
        throw new ConflictException('Desactive los conectores del proveedor antes de archivarlo.');
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
    if (typeof error === 'object' && error !== null && 'sqlMessage' in error && typeof error.sqlMessage === 'string') {
      return error.sqlMessage;
    }
    return undefined;
  }
}