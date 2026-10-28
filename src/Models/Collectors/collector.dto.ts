import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const jsonObject = z.record(z.string(), z.unknown());
const secretFieldName = /password|secret|token|community|string|private.?key|client.?secret/i;

function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).some(([key, child]) => secretFieldName.test(key) || containsSecretKey(child));
}

const safeJsonObject = jsonObject.refine(
  (value) => !containsSecretKey(value),
  'La configuración del Collector no puede contener secretos; utilice referencias seguras del Service.',
);

function isValidCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const ranges: Array<[number, number]> = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  return fields.every((field, index) => {
    const [minimum, maximum] = ranges[index];
    return field.split(',').every((part) => {
      const [base, rawStep, ...extra] = part.split('/');
      if (extra.length > 0) return false;
      if (rawStep !== undefined && (!/^\d+$/.test(rawStep) || Number(rawStep) < 1)) return false;
      if (base === '*') return true;
      const range = base.split('-');
      if (range.length > 2 || !range.every((value) => /^\d+$/.test(value))) return false;
      const values = range.map(Number);
      return values.every((value) => value >= minimum && value <= maximum)
        && (values.length === 1 || values[0] <= values[1]);
    });
  });
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const CollectorStatus = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED']);
export const ScheduleType = z.enum(['INTERVAL', 'CRON', 'MANUAL', 'EVENT']);
export const CollectorTriggerType = z.enum(['MANUAL', 'SCHEDULE', 'EVENT', 'RETRY']);

const CollectorTargetSchema = z.object({
  equipmentId: z.coerce.number().int().positive().nullable().optional(),
  targetIdentifier: z.string().trim().min(1).max(255),
  targetConfig: safeJsonObject.default({}),
  isActive: z.boolean().default(true),
}).strict();

const CollectorMethodSchema = z.object({
  extractionMethodId: z.coerce.number().int().positive(),
  methodVersionId: z.coerce.number().int().positive().nullable().optional(),
  executionOrder: z.coerce.number().int().min(0).default(0),
  parameters: safeJsonObject.default({}),
  isActive: z.boolean().default(true),
}).strict();

const CollectorScheduleSchema = z.object({
  scheduleType: ScheduleType,
  intervalSeconds: z.coerce.number().int().min(1).max(31536000).optional(),
  cronExpression: z.string().trim().min(9).max(120).refine(isValidCron, 'cronExpression debe ser una expresión cron válida de cinco campos.').optional(),
  timezone: z.string().trim().min(1).max(80).refine(isValidTimezone, 'timezone debe ser un identificador IANA válido.').default('UTC'),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  isEnabled: z.boolean().default(true),
}).strict().superRefine((schedule, context) => {
  if (schedule.scheduleType === 'INTERVAL' && schedule.intervalSeconds === undefined) {
    context.addIssue({ code: 'custom', message: 'intervalSeconds es obligatorio para INTERVAL.', path: ['intervalSeconds'] });
  }
  if (schedule.scheduleType !== 'INTERVAL' && schedule.intervalSeconds !== undefined) {
    context.addIssue({ code: 'custom', message: 'intervalSeconds solo aplica a INTERVAL.', path: ['intervalSeconds'] });
  }
  if (schedule.scheduleType === 'CRON' && !schedule.cronExpression) {
    context.addIssue({ code: 'custom', message: 'cronExpression es obligatorio para CRON.', path: ['cronExpression'] });
  }
  if (schedule.scheduleType !== 'CRON' && schedule.cronExpression !== undefined) {
    context.addIssue({ code: 'custom', message: 'cronExpression solo aplica a CRON.', path: ['cronExpression'] });
  }
  if (schedule.startAt && schedule.endAt && schedule.endAt <= schedule.startAt) {
    context.addIssue({ code: 'custom', message: 'endAt debe ser posterior a startAt.', path: ['endAt'] });
  }
});

const CollectorTransformationSchema = z.object({
  executionOrder: z.coerce.number().int().min(0),
  transformationType: z.enum([
    'RENAME_FIELD', 'CAST_TYPE', 'UNIT_CONVERSION', 'FILTER', 'MAP_VALUE',
    'CALCULATE', 'DELTA', 'RATE', 'TIMESTAMP_NORMALIZATION',
  ]),
  configuration: safeJsonObject,
  isEnabled: z.boolean().default(true),
}).strict();

const CollectorFieldMappingSchema = z.object({
  sourceField: z.string().trim().min(1).max(255),
  destinationField: z.string().trim().min(1).max(255),
  destinationType: z.string().trim().min(1).max(50),
  transformationConfig: safeJsonObject.default({}),
  isRequired: z.boolean().default(false),
}).strict();

const CollectorDestinationSchema = z.object({
  destinationType: z.enum(['SERVER_STORAGE', 'LOCAL_TEMPORARY_STORAGE']),
  destinationReference: z.string().trim().min(1).max(255),
  storageConfig: safeJsonObject.default({}),
  isEnabled: z.boolean().default(true),
}).strict();

const CollectorPolicySchema = z.object({
  timeoutMs: z.coerce.number().int().min(100).max(3600000).default(60000),
  maxRetries: z.coerce.number().int().min(0).max(20).default(3),
  retryDelayMs: z.coerce.number().int().min(0).max(3600000).default(1000),
  backoffStrategy: z.enum(['FIXED', 'EXPONENTIAL']).default('EXPONENTIAL'),
  maxConcurrency: z.coerce.number().int().min(1).max(100).default(1),
  overlapPolicy: z.enum(['SKIP', 'QUEUE', 'CANCEL_PREVIOUS']).default('SKIP'),
  batchSize: z.coerce.number().int().min(1).max(100000).default(1000),
  retentionPolicyReference: z.string().max(255).nullable().optional(),
}).strict();

export const CollectorConfigurationSchema = z.object({
  targets: z.array(CollectorTargetSchema).default([]),
  methods: z.array(CollectorMethodSchema).default([]),
  schedules: z.array(CollectorScheduleSchema).default([]),
  transformations: z.array(CollectorTransformationSchema).default([]),
  fieldMappings: z.array(CollectorFieldMappingSchema).default([]),
  destinations: z.array(CollectorDestinationSchema).default([]),
  policies: CollectorPolicySchema.default({
    timeoutMs: 60000,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffStrategy: 'EXPONENTIAL',
    maxConcurrency: 1,
    overlapPolicy: 'SKIP',
    batchSize: 1000,
  }),
}).strict();

export const CreateCollectorSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(1000).nullable().optional(),
  collectorType: z.string().trim().min(1).max(50).default('POLLING'),
  status: CollectorStatus.default('DRAFT'),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
}).strict();

export const UpdateCollectorSchema = CreateCollectorSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
);

export const CollectorFiltersSchema = z.object({
  search: z.string().trim().max(150).optional(),
  serviceId: z.coerce.number().int().positive().optional(),
  status: CollectorStatus.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

export const DuplicateCollectorSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(150),
}).strict();

export const CollectorRunSchema = z.object({
  triggerType: CollectorTriggerType.default('MANUAL'),
}).strict();

export const CollectorExecutionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

export type CreateCollectorInput = z.infer<typeof CreateCollectorSchema>;
export type UpdateCollectorInput = z.infer<typeof UpdateCollectorSchema>;
export type CollectorFilters = z.infer<typeof CollectorFiltersSchema>;
export type CollectorConfiguration = z.infer<typeof CollectorConfigurationSchema>;
export type CollectorExecutionFilters = z.infer<typeof CollectorExecutionFiltersSchema>;

export class CreateCollectorDto {
  @ApiProperty({ type: 'integer', format: 'int64' }) serviceId!: number;
  @ApiProperty({ maxLength: 100 }) code!: string;
  @ApiProperty({ maxLength: 150 }) name!: string;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true }) description?: string | null;
  @ApiPropertyOptional({ default: 'POLLING' }) collectorType?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED'], default: 'DRAFT' }) status?: string;
  @ApiPropertyOptional({ type: [String] }) tags?: string[];
}

export class UpdateCollectorDto {
  @ApiPropertyOptional({ type: 'integer', format: 'int64' }) serviceId?: number;
  @ApiPropertyOptional({ maxLength: 100 }) code?: string;
  @ApiPropertyOptional({ maxLength: 150 }) name?: string;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true }) description?: string | null;
  @ApiPropertyOptional() collectorType?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED'] }) status?: string;
  @ApiPropertyOptional({ type: [String] }) tags?: string[];
}

export class DuplicateCollectorDto {
  @ApiProperty({ maxLength: 100 }) code!: string;
  @ApiProperty({ maxLength: 150 }) name!: string;
}

export class CollectorStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED'] }) status!: z.infer<typeof CollectorStatus>;
}

export class CollectorRunDto {
  @ApiPropertyOptional({ enum: ['MANUAL', 'SCHEDULE', 'EVENT', 'RETRY'], default: 'MANUAL' })
  triggerType?: z.infer<typeof CollectorTriggerType>;
}

export class CollectorResponseDto {
  @ApiProperty({ type: 'integer', format: 'int64' }) id!: number;
  @ApiProperty({ type: 'integer', format: 'int64' }) serviceId!: number;
  @ApiProperty() serviceName!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() collectorType!: string;
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED'] }) status!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() configVersion!: number;
  @ApiPropertyOptional() lastExecutionStatus?: string | null;
  @ApiPropertyOptional() lastExecutionAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
