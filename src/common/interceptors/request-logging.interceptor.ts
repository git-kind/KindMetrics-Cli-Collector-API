import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { AppLogger } from '../logging/app-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const routePath = request.routeOptions.url ?? request.url;
        this.logger.log(
          `${request.method} ${routePath} ${Date.now() - startedAt}ms`,
        );
      }),
    );
  }
}