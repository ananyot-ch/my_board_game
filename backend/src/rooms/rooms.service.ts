import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { User } from '../users/user.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async create(dto: CreateRoomDto, host: User): Promise<Room> {
    const room = this.roomRepo.create({ ...dto, host });
    return this.roomRepo.save(room);
  }

  findAll(): Promise<Room[]> {
    return this.roomRepo.find({
      where: { status: RoomStatus.WAITING },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    const room = await this.findOne(id);
    room.status = status;
    return this.roomRepo.save(room);
  }

  async delete(id: string, userId: string): Promise<void> {
    const room = await this.findOne(id);
    if (room.host.id !== userId) throw new ForbiddenException();
    await this.roomRepo.remove(room);
  }
}
