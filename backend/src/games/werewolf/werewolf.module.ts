import { Module } from '@nestjs/common';
import { WerewolfService } from './werewolf.service';

@Module({
  providers: [WerewolfService],
  exports: [WerewolfService],
})
export class WerewolfModule {}
