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
import { InterviewsService, type CreateInterviewInput } from './interviews.service.js';

@ApiTags('Interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List interviews' })
  @ApiResponse({ status: 200, description: 'Interviews returned.' })
  list(@Query() filters: { category?: string; difficulty?: string; ownerId?: string; search?: string }) {
    return this.interviewsService.listInterviews(filters);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an interview' })
  @ApiResponse({ status: 200, description: 'Interview returned.' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.interviewsService.getInterview(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an interview' })
  @ApiResponse({ status: 201, description: 'Interview created.' })
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateInterviewInput) {
    return this.interviewsService.createInterview(user.userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an interview' })
  @ApiResponse({ status: 200, description: 'Interview updated.' })
  update(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateInterviewInput>) {
    return this.interviewsService.updateInterview(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an interview' })
  @ApiResponse({ status: 204, description: 'Interview deleted.' })
  delete(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.interviewsService.deleteInterview(user.userId, id);
  }
}
