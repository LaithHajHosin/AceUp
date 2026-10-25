import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { QuestionsService } from './questions.service.js';
import { QuestionFilterDto } from './dto/question-filter.dto.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { PublicQuestionDto, OwnerQuestionDto } from './dto/question-response.dto.js';
@ApiTags('questions')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}
  @Get() @ApiOkResponse({ type: PublicQuestionDto, isArray: true })
  list(@Query() query: QuestionFilterDto, @Req() req: Request) { return this.service.list(query, (req as any).user.userId); }
  @Get(':id') @ApiOkResponse({ type: OwnerQuestionDto })
  get(@Param('id', ParseIntPipe) id: number, @Req() req: Request) { return this.service.get(id, (req as any).user.userId); }
  @Post() @ApiCreatedResponse({ type: OwnerQuestionDto })
  create(@Body() body: CreateQuestionDto, @Req() req: Request) { return this.service.create(body, (req as any).user.userId); }
  @Patch(':id') @ApiOkResponse({ type: OwnerQuestionDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateQuestionDto, @Req() req: Request) { return this.service.update(id, body, (req as any).user.userId); }
  @Delete(':id') @HttpCode(204) @ApiNoContentResponse()
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) { await this.service.remove(id, (req as any).user.userId); }
}
