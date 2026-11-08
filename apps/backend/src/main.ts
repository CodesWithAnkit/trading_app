import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // spec 0021: only the web app's origin, and allow the Authorization header on preflight.
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
