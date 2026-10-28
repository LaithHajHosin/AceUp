import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service.js';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto.js';
import { CurrentUser, RequestUser } from '../auth/decorators/auth.decorators.js';

@ApiTags('Questions')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(@Inject(QuestionsService) private questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List questions with optional filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @ApiQuery({ name: 'type', required: false, enum: ['multiple_choice', 'short_answer', 'code_output'] })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
  ) {
    return this.questionsService.findAll(
      {
        category,
        difficulty,
        type,
        ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
        search,
      },
      user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question details' })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.questionsService.findOne(id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create question with type-specific validation' })
  @ApiResponse({ status: 201, description: 'Question created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto, user.userId, user.username);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update question (Owner or Admin only)' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete question (Owner or Admin only, protected against in-use)' })
  @ApiResponse({ status: 204, description: 'Question deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  @ApiResponse({ status: 409, description: 'Conflict (QUESTION_IN_USE)' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    await this.questionsService.remove(id, user.userId);
  }
}
