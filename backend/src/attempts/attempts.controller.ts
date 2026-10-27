import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import { AttemptsService, type CreateAttemptInput, type SubmitAnswerInput } from './attempts.service.js';

@ApiTags('Attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a new attempt on an interview' })
  @ApiResponse({ status: 201, description: 'Attempt created.' })
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateAttemptInput) {
    return this.attemptsService.createAttempt(user.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current user\'s attempts' })
  @ApiResponse({ status: 200, description: 'Attempts returned.' })
  list(@CurrentUser() user: { userId: number }, @Query('status') status?: string, @Query('interviewId') interviewId?: string) {
    return this.attemptsService.listAttempts(user.userId, status, interviewId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch an attempt' })
  @ApiResponse({ status: 200, description: 'Attempt returned.' })
  getOne(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.attemptsService.getAttempt(user.userId, id);
  }

  @Post(':id/answers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an answer for one question in an attempt' })
  @ApiResponse({ status: 201, description: 'Answer accepted.' })
  submitAnswer(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: SubmitAnswerInput) {
    return this.attemptsService.submitAnswer(user.userId, id, dto);
  }

  @Post(':id/finish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finish an active attempt' })
  @ApiResponse({ status: 200, description: 'Attempt finished.' })
  finish(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.attemptsService.finishAttempt(user.userId, id);
  }

  @Get(':id/results')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the final results for an attempt' })
  @ApiResponse({ status: 200, description: 'Attempt results returned.' })
  results(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.attemptsService.getResults(user.userId, id);
  }
}
