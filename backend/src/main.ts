import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function parseOrigins(raw: string | undefined): string[] | true {
  if (!raw || raw.trim() === '*') return true;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  app.enableCors({
    origin: parseOrigins(process.env.FRONTEND_URL),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on port ${port}`);
}
bootstrap();
