import { IsOptional, IsUUID } from 'class-validator';

export class BoardQueryDto {
  @IsOptional()
  @IsUUID()
  sprintId?: string;
}
