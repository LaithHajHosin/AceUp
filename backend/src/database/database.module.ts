/**
 * Global Database Module
 * Provides DatabaseService globally without circular imports
 */

import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
