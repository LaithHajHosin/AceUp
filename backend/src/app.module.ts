import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { AttemptsModule } from './attempts/attempts.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.example'] }),
    AuthModule,
    UsersModule,
    QuestionsModule,
    InterviewsModule,
    AttemptsModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    },
  ],
})
export class AppModule {}
