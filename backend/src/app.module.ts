/**
 * Root NestJS Application Module
 * Registers all feature modules and configures the global JWT Auth Guard.
 */

import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { AttemptsModule } from './attempts/attempts.module.js';
import { AdminModule } from './admin/admin.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    InterviewsModule,
    AttemptsModule,
    AdminModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
