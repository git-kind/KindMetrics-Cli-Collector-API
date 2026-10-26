import { Injectable } from '@nestjs/common';
import { LocalQueryRepository } from './local-query.repository';
import {
  CompanyContextRepository,
} from '../Contracts/company-context.repository';

interface CompanyRow {
  guid: string;
  databaseName: string | null;
}

@Injectable()
export class MySqlCompanyContextRepository implements CompanyContextRepository {
  constructor(private readonly queries: LocalQueryRepository) {}

  async findActiveCompanyGuidByCode(companyCode: string): Promise<string | null> {
    const companies = await this.queries.execute<Array<{ guid: string }>>(
      'SELECT `guid` FROM `company` WHERE `code` = ? AND `status` = ? LIMIT 1',
      [companyCode, 'ACTIVE'],
    );
    return companies[0]?.guid ?? null;
  }

  async validateUserAccess(
    companyGuid: string,
    userGuid: string,
  ): Promise<boolean> {
    const memberships = await this.queries.execute<Array<{ accessGranted: number }>>(
      'SELECT 1 AS `accessGranted` FROM `users` u INNER JOIN `user_roles` ur ON ur.`user_id` = u.`id` INNER JOIN `roles` r ON r.`id` = ur.`role_id` INNER JOIN `company` c ON c.`id` = r.`company_id` WHERE u.`guid` = ? AND u.`status` = ? AND c.`guid` = ? AND c.`status` = ? LIMIT 1',
      [userGuid, 'ACTIVE', companyGuid, 'ACTIVE'],
    );
    return memberships.length > 0;
  }

  async findActiveCompanyDatabaseName(companyGuid: string): Promise<string | null> {
    const companies = await this.queries.execute<CompanyRow[]>(
      'SELECT `guid`, `database_name` AS `databaseName` FROM `company` WHERE `guid` = ? AND `status` = ? LIMIT 1',
      [companyGuid, 'ACTIVE'],
    );
    return companies[0]?.databaseName ?? null;
  }
}