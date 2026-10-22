import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class QueriesService {
  execute(): never {
    throw new HttpException(
      'La ejecución de consultas aún no está disponible.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}