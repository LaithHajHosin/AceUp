import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InternalToolGuard } from '../common/guards/internal-tool.guard.js';
import {
  InternalQuestionsController,
  QuestionsController,
} from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { Question, QuestionSchema } from './schemas/question.schema.js';
import { SeedQuestionsService } from './seed-questions.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [QuestionsController, InternalQuestionsController],
  providers: [QuestionsService, SeedQuestionsService, InternalToolGuard],
  exports: [QuestionsService, SeedQuestionsService],
})
export class QuestionsModule {}
