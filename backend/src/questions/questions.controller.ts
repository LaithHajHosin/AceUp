import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Public } from '../common/public.decorator.js';
import { QuestionsService, type CreateQuestionInput, type QuestionFilterInput } from './questions.service.js';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List questions with optional filters' })
  @ApiResponse({ status: 200, description: 'Questions returned.' })
  list(@Query() query: QuestionFilterInput) {
    return this.questionsService.listQuestions(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one question' })
  @ApiResponse({ status: 200, description: 'Question returned.' })
  getOne(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.questionsService.getQuestion(user.userId, id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a question' })
  @ApiResponse({ status: 201, description: 'Question created.' })
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateQuestionInput) {
    return this.questionsService.createQuestion(user.userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'Question updated.' })
  update(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateQuestionInput>) {
    return this.questionsService.updateQuestion(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 204, description: 'Question deleted.' })
  delete(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.questionsService.deleteQuestion(user.userId, id);
  }
}
