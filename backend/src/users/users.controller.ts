import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import { UsersService, type UpdateProfileInput } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  updateMe(@CurrentUser() user: { userId: number }, @Body() dto: UpdateProfileInput) {
    return this.usersService.updateCurrentUser(user.userId, dto);
  }

  @Get(':id/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a public profile and stats for a user' })
  @ApiResponse({ status: 200, description: 'Public profile returned.' })
  getProfile(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getPublicProfile(userId);
  }
}
