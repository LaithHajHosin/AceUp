import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './auth.guard.js';
import { InMemoryStore } from '../common/store.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600) },
    }),
  ],
  controllers: [AuthController],
  providers: [InMemoryStore, AuthService, JwtAuthGuard, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService, InMemoryStore, JwtModule],
})
export class AuthModule {}
