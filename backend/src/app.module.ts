import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { ChatModule } from './chat/chat.module';
import { HealthController } from './health.controller';
import { User } from './users/user.entity';
import { Room } from './rooms/room.entity';
import { InitSchema1714200000000 } from './migrations/1714200000000-InitSchema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // DATABASE_URL takes precedence (Neon, Render, Railway all expose this)
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProd = config.get<string>('NODE_ENV') === 'production';

        const base = {
          type: 'postgres' as const,
          entities: [User, Room],
          // synchronize is dangerous in prod — it can drop columns silently.
          // Migrations handle prod schema; dev still uses synchronize for fast iteration.
          synchronize: !isProd,
          migrations: [InitSchema1714200000000],
          migrationsRun: isProd,
          // Managed Postgres (Neon/Render/Supabase) requires SSL
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };

        if (databaseUrl) {
          return { ...base, url: databaseUrl };
        }
        return {
          ...base,
          host: config.get<string>('DB_HOST') ?? 'localhost',
          port: Number(config.get<string>('DB_PORT') ?? 5432),
          username: config.get<string>('DB_USERNAME') ?? 'boardgame',
          password: config.get<string>('DB_PASSWORD') ?? 'boardgame_pass',
          database: config.get<string>('DB_NAME') ?? 'boardgame_db',
        };
      },
    }),
    AuthModule,
    UsersModule,
    RoomsModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
