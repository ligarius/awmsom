import { IsObject, IsOptional, IsString } from 'class-validator';

export class ConsumeEventDto {
  @IsString()
  source!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
