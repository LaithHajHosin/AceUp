import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateInterviewDto {
  @IsString() @MinLength(3) @MaxLength(100) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsString() @MinLength(2) @MaxLength(40) category!: string;
  @IsIn(['easy','medium','hard']) difficulty!: 'easy'|'medium'|'hard';
  @IsArray() @IsInt({each:true}) @Min(1,{each:true}) questionIds!: number[];
  @IsInt() @Min(30) @Max(3600) timeLimitSeconds!: number;
}
