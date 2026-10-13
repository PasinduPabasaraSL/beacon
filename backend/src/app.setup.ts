import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Env } from './config/env';

/** Signature images are sent as base64 data URLs of up to 200 KB. */
const JSON_BODY_LIMIT = '512kb';

export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService<Env, true>);

  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
