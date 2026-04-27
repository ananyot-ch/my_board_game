import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export enum GameType {
  MONOPOLY = 'monopoly',
  WEREWOLF = 'werewolf',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'enum', enum: GameType, default: GameType.MONOPOLY })
  gameType: GameType;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.WAITING })
  status: RoomStatus;

  @Column({ default: 4 })
  maxPlayers: number;

  @Column({ nullable: true, length: 50 })
  password: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  host: User;

  @CreateDateColumn()
  createdAt: Date;
}
