import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module.js';
import { HistoryController } from './history.controller.js';

@Module({
  imports: [SessionsModule],
  controllers: [HistoryController],
})
export class HistoryModule {}
