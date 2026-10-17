import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import { SessionsService } from './sessions.service.js';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a timed practice session' })
  @ApiConflictResponse({ description: 'Not enough matching active questions' })
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a session and safe question snapshots' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sessions.findOne(id);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Submit one answer for a question in the session' })
  @ApiConflictResponse({
    description: 'Session ended or answer already submitted',
  })
  submitAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.sessions.submitAnswer(id, dto);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Finish a session manually' })
  finish(@Param('id', ParseIntPipe) id: number) {
    return this.sessions.finish(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get results after the session ends' })
  @ApiConflictResponse({ description: 'Session has not ended' })
  results(@Param('id', ParseIntPipe) id: number) {
    return this.sessions.results(id);
  }
}
