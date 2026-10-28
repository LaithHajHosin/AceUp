import { Controller, Post, Get, Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service.js';
import { StartAttemptDto, SubmitAnswerDto } from './dto/attempt.dto.js';
import { CurrentUser, RequestUser } from '../auth/decorators/auth.decorators.js';
import type { Request } from 'express';

@ApiTags('Attempts')
@ApiBearerAuth()
@Controller('attempts')
export class AttemptsController {
  constructor(@Inject(AttemptsService) private attemptsService: AttemptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new interview attempt (snapshots questions & timer)' })
  @ApiResponse({ status: 201, description: 'Attempt created' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async start(@CurrentUser() user: RequestUser, @Body() dto: StartAttemptDto) {
    return this.attemptsService.start(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: "List current user's attempts" })
  @ApiQuery({ name: 'status', required: false, enum: ['in_progress', 'finished', 'timed_out'] })
  @ApiQuery({ name: 'interviewId', required: false })
  @ApiQuery({ name: 'all', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('interviewId') interviewId?: string,
    @Query('all') all?: string,
  ) {
    const isAdmin = (req as any).user?.username === 'admin' || all === 'true';
    return this.attemptsService.findAll(
      user.userId,
      isAdmin,
      status,
      interviewId ? parseInt(interviewId, 10) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attempt state (lazy timeout applied first)' })
  @ApiResponse({ status: 200, description: 'Attempt state' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const isAdmin = (req as any).user?.username === 'admin';
    return this.attemptsService.findOne(id, user.userId, isAdmin);
  }

  @Post(':id/answers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an answer under time pressure' })
  @ApiResponse({ status: 201, description: 'Answer accepted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict (ANSWER_DUPLICATE, ANSWER_LATE, ATTEMPT_ENDED)' })
  async submitAnswer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Body() dto: SubmitAnswerDto,
  ) {
    const isAdmin = (req as any).user?.username === 'admin';
    return this.attemptsService.submitAnswer(id, dto, user.userId, isAdmin);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish attempt and compute deterministic score' })
  @ApiResponse({ status: 200, description: 'Attempt scored' })
  @ApiResponse({ status: 409, description: 'Conflict (ATTEMPT_ENDED)' })
  async finish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const isAdmin = (req as any).user?.username === 'admin';
    return this.attemptsService.finish(id, user.userId, isAdmin);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get final scored results and per-question explanation review' })
  @ApiResponse({ status: 200, description: 'Detailed result breakdown' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  @ApiResponse({ status: 409, description: 'Conflict (ATTEMPT_NOT_ENDED)' })
  async getResults(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const isAdmin = (req as any).user?.username === 'admin';
    return this.attemptsService.getResults(id, user.userId, isAdmin);
  }
}
