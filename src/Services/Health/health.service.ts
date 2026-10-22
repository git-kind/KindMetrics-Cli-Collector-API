import { Inject, Injectable } from '@nestjs/common';
import { HealthResponseDto } from '../../Models/Common/health-response.dto';
import {
  HEALTH_REPOSITORY,
  HealthRepository,
} from '../../Repositories/Contracts/health.repository';

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_REPOSITORY)
    private readonly healthRepository: HealthRepository,
  ) {}

  async getHealth(): Promise<HealthResponseDto> {
    try {
      const connected = await this.healthRepository.canConnectToDatabase();
      return {
        status: connected ? 'ok' : 'degraded',
        database: connected ? 'connected' : 'disconnected',
      };
    } catch {
      return { status: 'degraded', database: 'disconnected' };
    }
  }
}