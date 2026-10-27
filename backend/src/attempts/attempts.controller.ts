import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AttemptsService } from './attempts.service.js';
import { CreateAttemptDto } from './dto/create-attempt.dto.js';
import { AttemptFilterDto } from './dto/attempt-filter.dto.js';
import { SubmitAnswerDto } from './dto/submit-answer.dto.js';
import {
  AttemptResponseDto,
  AttemptListItemDto,
  SubmitAnswerReceiptDto,
  AttemptResultsResponseDto,
} from './dto/attempt-response.dto.js';

interface RequestWithUser {
  user?: {
    userId: number;
    username: string;
  };
}

@ApiTags('attempts')
@ApiBearerAuth()
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new interview attempt' })
  @ApiResponse({
    status: 201,
    description: 'Attempt created and timer started',
    type: AttemptResponseDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND - Interview does not exist' })
  async createAttempt(
    @Req() req: RequestWithUser,
    @Body() dto: CreateAttemptDto,
  ): Promise<AttemptResponseDto> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.createAttempt(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List current user's attempts (newest first)" })
  @ApiResponse({
    status: 200,
    description: 'List of attempts',
    type: [AttemptListItemDto],
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  async getMyAttempts(
    @Req() req: RequestWithUser,
    @Query() filter: AttemptFilterDto,
  ): Promise<AttemptListItemDto[]> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.getMyAttempts(userId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attempt details (applies lazy timeout)' })
  @ApiParam({ name: 'id', description: 'Attempt ID', example: 33 })
  @ApiResponse({
    status: 200,
    description: 'Attempt details (safe question format without answer keys)',
    type: AttemptResponseDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'NOT_OWNER' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getAttemptById(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttemptResponseDto> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.getAttemptById(id, userId);
  }

  @Post(':id/answers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an answer for a question in this attempt' })
  @ApiParam({ name: 'id', description: 'Attempt ID', example: 33 })
  @ApiResponse({
    status: 201,
    description: 'Answer accepted (no correctness revealed)',
    type: SubmitAnswerReceiptDto,
  })
  @ApiResponse({ status: 400, description: 'QUESTION_NOT_IN_ATTEMPT | ANSWER_TYPE_MISMATCH | INVALID_CHOICE' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'NOT_OWNER' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ATTEMPT_ENDED | ANSWER_LATE | ANSWER_DUPLICATE' })
  async submitAnswer(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitAnswerDto,
  ): Promise<SubmitAnswerReceiptDto> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.submitAnswer(id, userId, dto);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish an attempt manually and calculate final scores' })
  @ApiParam({ name: 'id', description: 'Attempt ID', example: 33 })
  @ApiResponse({
    status: 200,
    description: 'Attempt finished and scored',
    type: AttemptResponseDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'NOT_OWNER' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ATTEMPT_ENDED' })
  async finishAttempt(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttemptResponseDto> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.finishAttempt(id, userId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get detailed results and question breakdown for an ended attempt' })
  @ApiParam({ name: 'id', description: 'Attempt ID', example: 33 })
  @ApiResponse({
    status: 200,
    description: 'Detailed attempt results',
    type: AttemptResultsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'NOT_OWNER' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ATTEMPT_NOT_ENDED' })
  async getAttemptResults(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AttemptResultsResponseDto> {
    const userId = req.user?.userId ?? 1;
    return this.attemptsService.getAttemptResults(id, userId);
  }
}
