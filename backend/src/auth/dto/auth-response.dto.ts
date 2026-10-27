import { ApiProperty } from '@nestjs/swagger';
import { PrivateUserDto } from '../../users/dto/user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'Bearer',
    enum: ['Bearer'],
  })
  tokenType!: 'Bearer';

  @ApiProperty({
    example: 3600,
    description: 'Token lifetime in seconds',
  })
  expiresIn!: number;

  @ApiProperty({ type: PrivateUserDto })
  user!: PrivateUserDto;
}
