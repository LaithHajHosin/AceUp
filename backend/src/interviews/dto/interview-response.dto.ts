import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class InterviewSummaryDto {
  @ApiProperty() id!: number;
  @ApiProperty() ownerId!: number;
  @ApiProperty({nullable:true}) ownerUsername!: string|null;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() category!: string;
  @ApiProperty({enum:['easy','medium','hard']}) difficulty!: string;
  @ApiProperty() questionCount!: number;
  @ApiProperty() timeLimitSeconds!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
export class InterviewDetailDto extends InterviewSummaryDto {
  @ApiPropertyOptional({type:'array',items:{type:'object'}}) questions!: unknown[];
}
