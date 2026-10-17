import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { ScoringService } from './scoring.service.js';
import { Session, SessionSchema } from './schemas/session.schema.js';
import { QuestionsModule } from '../questions/questions.module.js';


@Module({
  imports: [
    CommonModule,
    QuestionsModule,
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, ScoringService],
  exports: [SessionsService],
})
export class SessionsModule {}