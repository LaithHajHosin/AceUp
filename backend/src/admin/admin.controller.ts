import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { CurrentUser, RequestUser } from '../auth/decorators/auth.decorators.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Admin system metrics, user roles, and platform attempts' })
  @ApiResponse({ status: 200, description: 'Overview metrics' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async getOverview(@CurrentUser() user: RequestUser) {
    return this.adminService.getOverview(user.username, user.userId);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user authorization role (admin, author, user)' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.adminService.updateUserRole(id, role, user.username, user.userId);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Restore database to original 43 questions, tracks, and accounts' })
  @ApiResponse({ status: 200, description: 'Database reset' })
  @ApiResponse({ status: 403, description: 'Forbidden (Admin only)' })
  async resetSeeds(@CurrentUser() user: RequestUser) {
    return this.adminService.resetData(user.username, user.userId);
  }
}
