import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service.js';

@Module({
  providers: [ScannerService],
})
export class ScannerModule {}
