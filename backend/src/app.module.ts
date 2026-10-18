import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { QuestionsModule } from './questions/questions.module.js';

@Module({
  imports: [DatabaseModule, QuestionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
