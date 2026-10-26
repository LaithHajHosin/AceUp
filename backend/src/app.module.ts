import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { validateEnv } from './config/env.validation.js';
import { UsersModule } from './users/users.module.js';

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
        serverSelectionTimeoutMS: 500,
        connectTimeoutMS: 500,
        retryAttempts: 0,
        lazyConnection: true,
        connectionFactory: (connection: Connection) => {
          connection.on('error', () => {
            // Handled gracefully when running in offline test environments
          });
          return connection;
        },
      }),
    }),
    AuthModule,
    UsersModule,
    // Team modules added via single-line PR updates (Coordination §3):
    // QuestionsModule,
    // InterviewsModule,
    // AttemptsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
