import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppHttpException } from '../common/exceptions/app-http.exception.js';
import {
  INTERNAL_TOOL_KEY_HEADER,
  InternalToolGuard,
} from '../common/guards/internal-tool.guard.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import {
  QuestionFilterDto,
  QuestionListResponseDto,
  QuestionPublicDto,
} from './dto/question-filter.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { QuestionsService } from './questions.service.js';
import { Question } from './schemas/question.schema.js';

function parseNumericQuestionId(rawId: string): number {
  const trimmed = rawId.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new AppHttpException(
      HttpStatus.NOT_FOUND,
      'QUESTION_NOT_FOUND',
      `Question with id "${rawId}" was not found.`,
    );
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppHttpException(
      HttpStatus.NOT_FOUND,
      'QUESTION_NOT_FOUND',
      `Question with id "${rawId}" was not found.`,
    );
  }
  return parsed;
}

/**
 * Public Question Bank Controller (/api/v1/questions).
 * Unauthenticated candidate-safe routes that strictly redact grading fields.
 */
@ApiTags('Questions (Public)')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active questions with optional category, difficulty, and type filters',
    description:
      'Returns active questions only ({ items: QuestionPublicDto[] }). Never includes isCorrect, expectedKeywords, requiredKeywordCount, or expectedOutput.',
  })
  @ApiOkResponse({
    description: 'Active public questions matching filter criteria',
    type: QuestionListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'VALIDATION_ERROR — Invalid or unknown filter query parameter',
  })
  async findAll(
    @Query() filter: QuestionFilterDto,
  ): Promise<QuestionListResponseDto> {
    return this.questionsService.findAllPublic(filter);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get candidate-safe public question detail by numeric ID',
    description:
      'Returns a single question by numeric application ID with all private grading fields redacted.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 101,
    description: 'Numeric application question ID',
  })
  @ApiOkResponse({
    description: 'Safe public question detail',
    type: QuestionPublicDto,
  })
  @ApiNotFoundResponse({
    description: 'QUESTION_NOT_FOUND — Numeric question ID does not exist',
  })
  async findOne(@Param('id') rawId: string): Promise<QuestionPublicDto> {
    const id = parseNumericQuestionId(rawId);
    return this.questionsService.findOnePublicById(id);
  }
}

/**
 * Guarded Internal Question Management Controller (/api/v1/internal/questions).
 * Requires `x-internal-tool-key` matching `process.env.INTERNAL_TOOL_KEY`.
 */
@ApiTags('Internal Question Management (Guarded)')
@ApiSecurity('internal-tool-key')
@ApiHeader({
  name: INTERNAL_TOOL_KEY_HEADER,
  description: 'Internal administrative key matching backend INTERNAL_TOOL_KEY',
  required: true,
})
@UseGuards(InternalToolGuard)
@Controller('internal/questions')
export class InternalQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new question in the Question Bank (Guarded)',
    description:
      'Validates common and type-specific fields, assigns the next numeric application ID, and persists the question.',
  })
  @ApiCreatedResponse({
    description: 'Question created successfully',
  })
  @ApiBadRequestResponse({
    description:
      'VALIDATION_ERROR — Missing required fields, unknown fields, or invalid type-specific configuration',
  })
  @ApiUnauthorizedResponse({
    description: 'UNAUTHORIZED — Missing or invalid x-internal-tool-key header',
  })
  async create(@Body() dto: CreateQuestionDto): Promise<Question> {
    return this.questionsService.createInternal(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing question by numeric ID (Guarded)',
    description:
      'Merges allowed changes and validates the complete resulting question shape. Existing session snapshots remain unchanged.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 101,
    description: 'Numeric application question ID',
  })
  @ApiOkResponse({
    description: 'Question updated successfully',
  })
  @ApiBadRequestResponse({
    description:
      'VALIDATION_ERROR — Resulting question shape or field combination is invalid',
  })
  @ApiUnauthorizedResponse({
    description: 'UNAUTHORIZED — Missing or invalid x-internal-tool-key header',
  })
  @ApiNotFoundResponse({
    description: 'QUESTION_NOT_FOUND — Numeric question ID does not exist',
  })
  async update(
    @Param('id') rawId: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<Question> {
    const id = parseNumericQuestionId(rawId);
    return this.questionsService.updateInternal(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate a question by numeric ID (Guarded soft-delete)',
    description:
      'Sets active=false so the question is excluded from public browsing and future sessions while preserving historical records.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 101,
    description: 'Numeric application question ID',
  })
  @ApiOkResponse({
    description: 'Question deactivated (active=false)',
  })
  @ApiUnauthorizedResponse({
    description: 'UNAUTHORIZED — Missing or invalid x-internal-tool-key header',
  })
  @ApiNotFoundResponse({
    description: 'QUESTION_NOT_FOUND — Numeric question ID does not exist',
  })
  async deactivate(@Param('id') rawId: string): Promise<Question> {
    const id = parseNumericQuestionId(rawId);
    return this.questionsService.deactivateInternal(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a question by numeric ID if never used in any session (Guarded)',
    description:
      'Deletes the question only if it has never been referenced by a session snapshot. Otherwise returns 409 QUESTION_IN_USE and recommends deactivation.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 101,
    description: 'Numeric application question ID',
  })
  @ApiOkResponse({
    description: 'Unused question deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'UNAUTHORIZED — Missing or invalid x-internal-tool-key header',
  })
  @ApiNotFoundResponse({
    description: 'QUESTION_NOT_FOUND — Numeric question ID does not exist',
  })
  @ApiConflictResponse({
    description:
      'QUESTION_IN_USE — Question has been referenced by a session; deactivate it instead',
  })
  async remove(
    @Param('id') rawId: string,
  ): Promise<{ deleted: true; id: number }> {
    const id = parseNumericQuestionId(rawId);
    return this.questionsService.deleteInternal(id);
  }
}
