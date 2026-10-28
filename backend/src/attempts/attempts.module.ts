import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';
import { ScoringService } from './scoring.service.js';

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService, ScoringService],
  exports: [AttemptsService, ScoringService],
})
export class AttemptsModule {}
