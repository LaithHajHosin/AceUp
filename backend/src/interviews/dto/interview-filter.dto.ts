import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
export class InterviewFilterDto {
  @IsOptional() @IsString() @Transform(({value}) => String(value).trim().toLowerCase()) category?: string;
  @IsOptional() @IsIn(['easy','medium','hard']) difficulty?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) ownerId?: number;
  @IsOptional() @IsString() @MinLength(1) search?: string;
}
