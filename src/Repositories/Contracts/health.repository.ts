export const HEALTH_REPOSITORY = Symbol('HEALTH_REPOSITORY');

export interface HealthRepository {
  canConnectToDatabase(): Promise<boolean>;
}