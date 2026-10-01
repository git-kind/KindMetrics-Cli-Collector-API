export class HttpErrorResponseDto {
  statusCode!: number;
  timestamp!: string;
  path!: string;
  message!: string | string[];
}