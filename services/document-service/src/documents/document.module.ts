import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, JwtAuthGuard],
  exports: [DocumentService],
})
export class DocumentsModule {}
