import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service.js';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto.js';
import { CurrentUser, RequestUser, Public } from '../auth/decorators/auth.decorators.js';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller('interviews')
export class InterviewsController {
  constructor(@Inject(InterviewsService) private interviewsService: InterviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List interviews with optional filters' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
  ) {
    return this.interviewsService.findAll({
      category,
      difficulty,
      ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
      search,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get interview details with safe question list' })
  @ApiResponse({ status: 200, description: 'Interview detail' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.interviewsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an interview track' })
  @ApiResponse({ status: 201, description: 'Interview created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(dto, user.userId, user.username);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview (Owner or Admin only)' })
  @ApiResponse({ status: 200, description: 'Interview updated' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete interview (Owner or Admin only)' })
  @ApiResponse({ status: 204, description: 'Interview deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden (NOT_OWNER)' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    await this.interviewsService.remove(id, user.userId);
  }
}
