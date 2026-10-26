import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExtractionMethodController } from '../../Controllers/ExtractionMethods/extraction-method.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EXTRACTION_METHOD_REPOSITORY } from '../../Repositories/Contracts/extraction-method.repository';
import { MySqlExtractionMethodRepository } from '../../Repositories/StoredProcedures/mysql-extraction-method.repository';
import { ExtractionMethodService } from '../../Services/ExtractionMethods/extraction-method.service';
import { ExtractionCatalogController } from '../../Controllers/ExtractionMethods/extraction-catalog.controller';
import { EXTRACTION_CATALOG_REPOSITORY } from '../../Repositories/Contracts/extraction-catalog.repository';
import { MySqlExtractionCatalogRepository } from '../../Repositories/StoredProcedures/mysql-extraction-catalog.repository';
import { ExtractionCatalogService } from '../../Services/ExtractionMethods/extraction-catalog.service';

@Module({
  imports: [AuthModule],
  controllers: [ExtractionMethodController, ExtractionCatalogController],
  providers: [
    ExtractionMethodService,
    ExtractionCatalogService,
    JwtAuthGuard,
    MySqlExtractionMethodRepository,
    MySqlExtractionCatalogRepository,
    {
      provide: EXTRACTION_METHOD_REPOSITORY,
      useExisting: MySqlExtractionMethodRepository,
    },
    {
      provide: EXTRACTION_CATALOG_REPOSITORY,
      useExisting: MySqlExtractionCatalogRepository,
    },
  ],
})
export class ExtractionMethodsModule {}