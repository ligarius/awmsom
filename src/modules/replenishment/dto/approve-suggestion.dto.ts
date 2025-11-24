import { IsBoolean, IsUUID } from 'class-validator';

export class ApproveSuggestionDto {
  @IsUUID()
  suggestionId!: string;

  @IsBoolean()
  approve!: boolean;
}
