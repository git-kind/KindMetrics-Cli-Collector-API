import { Module } from '@nestjs/common';
import { QueriesController } from '../../Controllers/Queries/queries.controller';
import { QueriesService } from '../../Services/Queries/queries.service';

@Module({ controllers: [QueriesController], providers: [QueriesService] })
export class QueriesModule {}