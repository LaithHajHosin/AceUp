import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { validateEnv } from './config/env.validation.js';
import { UsersModule } from './users/users.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { AttemptsModule } from './attempts/attempts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        'backend/.env',
        '.env.example',
        'backend/.env.example',
      ],
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
        connectionFactory: (connection: Connection) => {
          connection.on('error', () => {
            // Handled gracefully
          });
          return connection;
        },
      }),
    }),
    AuthModule,
    UsersModule,
    QuestionsModule,
    InterviewsModule,
    AttemptsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
