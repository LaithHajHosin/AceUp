import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'Alex B',
    description: 'Updated display name (2–50 characters)',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    example: 'Backend learner',
    nullable: true,
    description: 'User bio (max 300 characters, or null to clear)',
    maxLength: 300,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(300)
  bio?: string | null;
}
