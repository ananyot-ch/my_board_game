import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonopolyService } from './monopoly.service';
import { QuizService } from './quiz.service';

@Module({
  imports: [ConfigModule],
  providers: [MonopolyService, QuizService],
  exports: [MonopolyService, QuizService],
})
export class MonopolyModule {}
