import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from '../sessions/sessions.service.js';

@ApiTags('history')
@Controller('history')
export class HistoryController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Find session history by exact display name' })
  findByDisplayName(@Query('displayName') displayName: string) {
    return this.sessions.history(displayName ?? '');
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get a historical session and saved answers' })
  findOne(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.sessions.historyDetail(sessionId);
  }
}
