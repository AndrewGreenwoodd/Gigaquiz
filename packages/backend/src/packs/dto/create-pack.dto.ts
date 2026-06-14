import { Type } from 'class-transformer';
import { IsString, IsBoolean, IsInt, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';

export class CreateQuestionDto {
  @IsString() text: string;
  @IsString() answer: string;
  @IsArray() @IsString({ each: true }) @IsOptional() options?: string[];
  @IsInt() @Min(0) points: number;
  @IsString() @IsOptional() imageUrl?: string;
  @IsInt() order: number;
}

export class CreateCategoryDto {
  @IsString() name: string;
  @IsInt() order: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateQuestionDto) questions: CreateQuestionDto[];
}

export class CreatePackDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() authorName: string;
  @IsBoolean() @IsOptional() isPublic?: boolean;
  @IsInt() @Min(1) @IsOptional() timerDuration?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCategoryDto) categories: CreateCategoryDto[];
}
