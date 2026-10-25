import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InterviewsService } from './interviews.service.js';
import { InterviewFilterDto } from './dto/interview-filter.dto.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';
import { UpdateInterviewDto } from './dto/update-interview.dto.js';
import { InterviewDetailDto, InterviewSummaryDto } from './dto/interview-response.dto.js';
@ApiTags('interviews') @ApiBearerAuth() @Controller('interviews')
export class InterviewsController {
  constructor(private readonly service:InterviewsService){}
  @Get() @ApiOkResponse({type:InterviewSummaryDto,isArray:true})
  list(@Query() query:InterviewFilterDto){return this.service.list(query);}
  @Get(':id') @ApiOkResponse({type:InterviewDetailDto})
  get(@Param('id',ParseIntPipe) id:number){return this.service.get(id);}
  @Post() @ApiCreatedResponse({type:InterviewDetailDto})
  create(@Body() body:CreateInterviewDto,@Req() req:Request){return this.service.create(body,(req as any).user.userId);}
  @Patch(':id') @ApiOkResponse({type:InterviewDetailDto})
  update(@Param('id',ParseIntPipe) id:number,@Body() body:UpdateInterviewDto,@Req() req:Request){return this.service.update(id,body,(req as any).user.userId);}
  @Delete(':id') @HttpCode(204) @ApiNoContentResponse()
  async remove(@Param('id',ParseIntPipe) id:number,@Req() req:Request){await this.service.remove(id,(req as any).user.userId);}
}
