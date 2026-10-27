import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import { SessionsService, type CreateSessionInput, type SessionAnswerInput, type SessionResponse } from './sessions.service.js';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a practice session for a user' })
  @ApiResponse({ status: 201, description: 'Session created.' })
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateSessionInput): SessionResponse {
    return this.sessionsService.createSession(user.userId, dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a session' })
  @ApiResponse({ status: 200, description: 'Session returned.' })
  getOne(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number): SessionResponse {
    return this.sessionsService.getSession(id);
  }

  @Post(':id/answers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an answer for a session question' })
  @ApiResponse({ status: 201, description: 'Answer accepted.' })
  submitAnswer(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: SessionAnswerInput) {
    return this.sessionsService.submitAnswer(id, dto);
  }

  @Post(':id/finish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finish a session' })
  @ApiResponse({ status: 200, description: 'Session finished.' })
  finish(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number): SessionResponse {
    return this.sessionsService.finishSession(id);
  }
}
