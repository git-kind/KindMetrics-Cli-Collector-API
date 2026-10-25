import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyContext } from '../../common/company-context/company-context';
import {
  EXTRACTION_METHOD_REPOSITORY,
  ExtractionMethodRecord,
  ExtractionMethodRepository,
  CreateExtractionMethodInput,
  UpdateExtractionMethodInput,
} from '../../Repositories/Contracts/extraction-method.repository';

@Injectable()
export class ExtractionMethodService {
  constructor(
    @Inject(EXTRACTION_METHOD_REPOSITORY)
    private readonly methods: ExtractionMethodRepository,
  ) {}

  async list(company: CompanyContext) {
    const methods = await this.methods.list(company.companyGuid);
    return methods.map((method) => this.withoutSecrets(method));
  }

  async get(company: CompanyContext, id: string) {
    const method = await this.methods.findById(company.companyGuid, id);
    if (!method) throw new NotFoundException('Método de extracción no encontrado.');
    return this.withoutSecrets(method);
  }

  async create(company: CompanyContext, input: CreateExtractionMethodInput) {
    return this.withoutSecrets(
      await this.methods.create(company.companyGuid, input),
    );
  }

  async update(company: CompanyContext, id: string, input: UpdateExtractionMethodInput) {
    const method = await this.methods.update(company.companyGuid, id, input);
    if (!method) throw new NotFoundException('Método de extracción no encontrado.');
    return this.withoutSecrets(method);
  }

  async delete(company: CompanyContext, id: string): Promise<{ deleted: true }> {
    const deleted = await this.methods.delete(company.companyGuid, id);
    if (!deleted) throw new NotFoundException('Método de extracción no encontrado.');
    return { deleted: true };
  }

  private withoutSecrets(method: ExtractionMethodRecord) {
    const { hasCredentials, ...record } = method;
    return { ...record, hasCredentials: Boolean(hasCredentials) };
  }
}