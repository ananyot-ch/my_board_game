import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { MonopolyModule } from '../games/monopoly/monopoly.module';
import { WerewolfModule } from '../games/werewolf/werewolf.module';

@Module({
  imports: [AuthModule, RoomsModule, MonopolyModule, WerewolfModule],
  providers: [ChatGateway],
})
export class ChatModule {}
