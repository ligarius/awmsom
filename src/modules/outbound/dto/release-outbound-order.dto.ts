import { IsOptional, IsString } from 'class-validator';

export class ReleaseOutboundOrderDto {
  @IsOptional()
  @IsString()
  confirmation?: string;
}
