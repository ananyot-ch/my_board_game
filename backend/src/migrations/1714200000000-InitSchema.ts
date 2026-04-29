import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — creates the `users` and `rooms` tables.
 * This is a bootstrap migration so production deploys can start with a fresh DB
 * even after `synchronize: false` is set.
 */
export class InitSchema1714200000000 implements MigrationInterface {
  name = 'InitSchema1714200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure UUID generation function exists (Neon enables this on demand)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(30) NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "displayName" character varying(100),
        "avatarUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // enums for rooms
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "rooms_gametype_enum" AS ENUM('monopoly','werewolf');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "rooms_status_enum" AS ENUM('waiting','playing','finished');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // rooms
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "gameType" "rooms_gametype_enum" NOT NULL DEFAULT 'monopoly',
        "status" "rooms_status_enum" NOT NULL DEFAULT 'waiting',
        "maxPlayers" integer NOT NULL DEFAULT 4,
        "password" character varying(50),
        "hostId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rooms_host" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rooms_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rooms_gametype_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
