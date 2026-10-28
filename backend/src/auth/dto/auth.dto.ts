import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex_dev', description: 'Username 3-30 chars, lowercase alphanumeric or underscore' })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9_]+$/, { message: 'username must contain only lowercase alphanumeric and underscore characters' })
  username!: string;

  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail({}, { message: 'valid email is required' })
  email!: string;

  @ApiProperty({ example: 'secret123', description: 'Password 8-72 chars' })
  @IsString()
  @Length(8, 72)
  password!: string;

  @ApiProperty({ example: 'Alex Rivera', description: 'Display name 2-50 chars' })
  @IsString()
  @Length(2, 50)
  displayName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex_dev', required: false })
  @IsOptional()
  @IsString()
  usernameOrEmail?: string;

  @ApiProperty({ example: 'alex_dev', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'alex@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  password!: string;
}
