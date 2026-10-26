import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateMeDto } from './dto/update-me.dto.js';
import {
  PrivateUserDto,
  UserProfileResponseDto,
} from './dto/user-response.dto.js';
import { ProfileStatsService } from './profile-stats.service.js';
import { UsersService } from './users.service.js';

interface AuthenticatedRequest {
  user: {
    userId: number;
    username: string;
  };
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileStatsService: ProfileStatsService,
  ) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update current user displayName and/or bio' })
  @ApiOkResponse({
    description: 'Updated current user profile (PrivateUser)',
    type: PrivateUserDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (400 VALIDATION_FAILED)',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired token (401 UNAUTHORIZED)',
  })
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMeDto,
  ): Promise<PrivateUserDto> {
    return this.usersService.updateMe(req.user.userId, dto);
  }

  @Get(':id/profile')
  @ApiOperation({
    summary: 'Get public profile and activity statistics for a user by id',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Positive integer user id',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Public user info and computed profile statistics',
    type: UserProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid user id parameter (400 VALIDATION_FAILED)',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired token (401 UNAUTHORIZED)',
  })
  @ApiNotFoundResponse({
    description: 'User not found (404 NOT_FOUND)',
  })
  async getUserProfile(
    @Param('id') rawId: string,
  ): Promise<UserProfileResponseDto> {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: ['id must be a positive integer'],
      });
    }

    const [user, stats] = await Promise.all([
      this.usersService.findPublicByIdOrThrow(id),
      this.profileStatsService.getStatsForUser(id),
    ]);

    return { user, stats };
  }
}
