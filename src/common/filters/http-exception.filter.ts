import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppLogger } from '../logging/app-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = this.getSafeMessage(exception, statusCode);
    const message =
      statusCode === HttpStatus.UNPROCESSABLE_ENTITY
        ? 'Existen errores de validación.'
        : statusCode === HttpStatus.NOT_IMPLEMENTED
          ? 'La operación aún no está implementada.'
          : statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Error interno del servidor.'
            : typeof details === 'string'
              ? details
              : 'La solicitud no pudo ser procesada.';

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} ${statusCode}`);
    }

    response.status(statusCode).send({
      success: false,
      message,
      data: null,
      errors: (Array.isArray(details) ? details : [message]).map((detail) => ({
        code: this.getErrorCode(exception, statusCode),
        message: detail,
      })),
      meta: { requestId: request.id },
    });
  }

  private getErrorCode(exception: unknown, statusCode: number): string {
    if (
      statusCode === HttpStatus.BAD_REQUEST ||
      statusCode === HttpStatus.UNPROCESSABLE_ENTITY
    ) return 'VALIDATION_ERROR';
    if (statusCode === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
    if (statusCode === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
    if (statusCode === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
    if (statusCode === HttpStatus.NOT_IMPLEMENTED) return 'NOT_IMPLEMENTED';
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) return 'INTERNAL_ERROR';
    if (exception instanceof HttpException) return `HTTP_${statusCode}`;
    return 'REQUEST_ERROR';
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