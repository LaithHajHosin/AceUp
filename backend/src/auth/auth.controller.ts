import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PrivateUserDto } from '../users/dto/user-response.dto.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './public.decorator.js';

interface AuthenticatedRequest {
  user: {
    userId: number;
    username: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account (public)' })
  @ApiCreatedResponse({
    description: 'User registered and JWT token issued',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (400 VALIDATION_FAILED)',
  })
  @ApiConflictResponse({
    description: 'Username or email already taken (409 USERNAME_TAKEN / EMAIL_TAKEN)',
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with username or email and password (public)' })
  @ApiOkResponse({
    description: 'Authenticated successfully and JWT token issued',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (400 VALIDATION_FAILED)',
  })
  @ApiUnauthorizedResponse({
    description: 'Wrong username/email or password (401 INVALID_CREDENTIALS)',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user (PrivateUser)' })
  @ApiOkResponse({
    description: 'Current authenticated user profile including email',
    type: PrivateUserDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired token (401 UNAUTHORIZED)',
  })
  async getMe(@Req() req: AuthenticatedRequest): Promise<PrivateUserDto> {
    return this.authService.getMe(req.user.userId);
  }
}
