import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CompanyContextRequest } from './company-context';

export const CurrentCompany = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<CompanyContextRequest>();
    return request.companyContext;
  },
);