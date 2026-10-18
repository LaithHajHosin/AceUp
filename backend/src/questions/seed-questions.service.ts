import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { SEED_QUESTIONS } from './seed-questions.js';

/**
 * Repeatable startup initializer that seeds the 78 team-authored questions
 * on first boot when the Question Bank is empty, without duplicating records
 * across subsequent backend restarts.
 */
@Injectable()
export class SeedQuestionsService implements OnModuleInit {
  private readonly logger = new Logger(SeedQuestionsService.name);

  constructor(private readonly questionsService: QuestionsService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedIfEmpty();
    } catch (err) {
      this.logger.error(
        'Failed to initialize seed questions on module startup',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async seedIfEmpty(): Promise<{ seededCount: number; totalCount: number }> {
    return this.questionsService.seedInitialQuestions(SEED_QUESTIONS);
  }
}
