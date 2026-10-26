import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'alex_dev',
    description: 'Username or email address',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  usernameOrEmail!: string;

  @ApiProperty({
    example: 'secret123',
    description: 'Account password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
