import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppLogger } from './common/logging/app-logger.service';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ genReqId: () => `req-${randomUUID()}` }),
  );
  const logger = app.get(AppLogger);
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('api.corsOrigins') ?? [];

  app.useLogger(logger);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Company-Code',
    ],
    credentials: false,
    optionsSuccessStatus: 204,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new RequestLoggingInterceptor(logger));
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KindMetricsAPI')
    .setDescription('KindMetrics REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/json' });

  const host = config.get<string>('api.host') ?? '127.0.0.1';
  const port = config.get<number>('api.port') ?? 3000;
  try {
    await app.listen(port, host);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'EADDRINUSE'
    ) {
      logger.error(
        `No se pudo iniciar el API: el puerto ${port} en ${host} está ocupado por otra aplicación. Cambia API_PORT o detén la aplicación que lo utiliza.`,
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  }

  const baseUrl = await app.getUrl();
  logger.log(`Servicio ejecutándose en ${host}:${port}`);
  logger.log(`Collector API: ${baseUrl}/api/v1`);
  logger.log(`Swagger: ${baseUrl}/docs`);
}

void bootstrap();