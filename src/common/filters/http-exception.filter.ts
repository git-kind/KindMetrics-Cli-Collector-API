import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logging/app-logger.service';
import { HttpErrorResponseDto } from '../errors/http-error-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getSafeMessage(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.path} ${statusCode}`);
    }

    const body: HttpErrorResponseDto = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.path,
      message,
    };

    response.status(statusCode).json(body);
  }

  private getSafeMessage(
    exception: unknown,
    statusCode: number,
  ): string | string[] {
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    if (!(exception instanceof HttpException)) {
      return 'Request failed';
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const responseMessage = exceptionResponse.message;
      if (
        typeof responseMessage === 'string' ||
        (Array.isArray(responseMessage) &&
          responseMessage.every((item) => typeof item === 'string'))
      ) {
        return responseMessage;
      }
    }

    return exception.message;
  }
}