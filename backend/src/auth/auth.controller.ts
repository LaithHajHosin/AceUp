import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { AuthService, type LoginInput, type RegisterInput } from './auth.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Username or email already used.' })
  async register(@Body() dto: RegisterInput) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and receive a JWT' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  async login(@Body() dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current logged-in user' })
  @ApiResponse({ status: 200, description: 'Current user details.' })
  async me(@CurrentUser() user: { userId: number; username: string }) {
    const account = await this.authService.validateUser(user.userId);
    return {
      id: account.id,
      username: account.username,
      email: account.email,
      displayName: account.displayName,
      bio: account.bio,
      createdAt: account.createdAt,
    };
  }
}
