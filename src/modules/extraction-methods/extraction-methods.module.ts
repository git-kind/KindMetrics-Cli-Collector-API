import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExtractionMethodController } from '../../Controllers/ExtractionMethods/extraction-method.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EXTRACTION_METHOD_REPOSITORY } from '../../Repositories/Contracts/extraction-method.repository';
import { MySqlExtractionMethodRepository } from '../../Repositories/StoredProcedures/mysql-extraction-method.repository';
import { ExtractionMethodService } from '../../Services/ExtractionMethods/extraction-method.service';

@Module({
  imports: [AuthModule],
  controllers: [ExtractionMethodController],
  providers: [
    ExtractionMethodService,
    JwtAuthGuard,
    MySqlExtractionMethodRepository,
    {
      provide: EXTRACTION_METHOD_REPOSITORY,
      useExisting: MySqlExtractionMethodRepository,
    },
  ],
})
export class ExtractionMethodsModule {}