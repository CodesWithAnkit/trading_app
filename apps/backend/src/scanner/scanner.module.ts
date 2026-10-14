import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service.js';

@Module({
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
