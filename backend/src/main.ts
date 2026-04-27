import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Build a CORS origin checker that accepts:
 *   - exact match against FRONTEND_URL entries (comma-separated)
 *   - any *.vercel.app preview deployment of the same project
 *   - same-origin / no-origin requests (curl, health checks)
 */
function buildOriginChecker(raw: string | undefined): any {
  if (!raw || raw.trim() === '*') return true;
  const allowed = new Set(raw.split(',').map(s => s.trim()).filter(Boolean));

  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (allowed.has(origin)) return cb(null, true);
    if (/^https:\/\/my-board-game(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`), false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  app.enableCors({
    origin: buildOriginChecker(process.env.FRONTEND_URL),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on port ${port}`);
}
bootstrap();
