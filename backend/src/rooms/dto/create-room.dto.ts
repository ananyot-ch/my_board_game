import { IsString, IsEnum, IsOptional, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { GameType } from '../room.entity';

export class CreateRoomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsEnum(GameType)
  gameType: GameType;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  maxPlayers?: number;

  @IsOptional()
  @IsString()
  password?: string;
}
