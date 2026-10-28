import {
  CollectorConfiguration,
  CollectorExecutionFilters,
  CollectorFilters,
  CreateCollectorInput,
  UpdateCollectorInput,
} from '../../Models/Collectors/collector.dto';

export const COLLECTOR_REPOSITORY = Symbol('COLLECTOR_REPOSITORY');

export type CollectorRow = Record<string, unknown> & {
  id: number;
  serviceId: number;
  serviceName: string;
  code: string;
  name: string;
};

export interface CollectorRepository {
  list(companyGuid: string, filters: CollectorFilters): Promise<CollectorRow[]>;
  get(companyGuid: string, id: number): Promise<CollectorRow | null>;
  create(companyGuid: string, input: CreateCollectorInput, userGuid: string): Promise<CollectorRow>;
  update(companyGuid: string, id: number, input: UpdateCollectorInput, userGuid: string): Promise<CollectorRow | null>;
  duplicate(companyGuid: string, id: number, code: string, name: string, userGuid: string): Promise<CollectorRow | null>;
  setStatus(companyGuid: string, id: number, status: string, userGuid: string): Promise<CollectorRow | null>;
  delete(companyGuid: string, id: number): Promise<boolean>;
  getConfiguration(companyGuid: string, id: number): Promise<Record<string, unknown> | null>;
  saveConfiguration(companyGuid: string, id: number, configuration: CollectorConfiguration, userGuid: string): Promise<Record<string, unknown> | null>;
  validate(companyGuid: string, id: number): Promise<{ valid: true }>;
  usageByService(companyGuid: string, serviceId: number): Promise<number>;
  enqueue(companyGuid: string, id: number, triggerType: string, userGuid: string): Promise<Record<string, unknown>>;
  listExecutions(companyGuid: string, id: number, filters: CollectorExecutionFilters): Promise<Record<string, unknown>[]>;
  getExecution(companyGuid: string, id: number, executionId: number): Promise<Record<string, unknown> | null>;
  health(companyGuid: string, id: number): Promise<Record<string, unknown> | null>;
  listVersions(companyGuid: string, id: number): Promise<Record<string, unknown>[]>;
  getVersion(companyGuid: string, id: number, version: number): Promise<Record<string, unknown> | null>;
  getByService(companyGuid: string, serviceId: number, filters: CollectorExecutionFilters): Promise<CollectorRow[]>;
}
