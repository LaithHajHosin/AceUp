import { ApiProperty } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'alex_dev' })
  username!: string;

  @ApiProperty({ example: 'Alex' })
  displayName!: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  bio!: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;
}

export class PrivateUserDto extends PublicUserDto {
  @ApiProperty({ example: 'alex@example.com' })
  email!: string;
}

export class ProfileStatsDto {
  @ApiProperty({ example: 12 })
  questionsCreated!: number;

  @ApiProperty({ example: 3 })
  interviewsCreated!: number;

  @ApiProperty({ example: 7 })
  attemptsCompleted!: number;

  @ApiProperty({ example: 1 })
  attemptsInProgress!: number;

  @ApiProperty({ example: 41 })
  questionsAnswered!: number;

  @ApiProperty({ example: 72.4, nullable: true, type: Number })
  averagePercentage!: number | null;

  @ApiProperty({ example: 95.0, nullable: true, type: Number })
  bestPercentage!: number | null;
}

export class UserProfileResponseDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty({ type: ProfileStatsDto })
  stats!: ProfileStatsDto;
}
