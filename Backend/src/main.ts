import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const port = configService.get<number>('PORT', 3001);

  // Enable trust proxy to correctly extract client IP from proxy headers
  // This is essential for rate limiting and security when behind nginx, load balancers, etc.
  // Set to 1 to trust the first proxy (most common setup)
  // In production with multiple proxies, adjust based on your infrastructure
  app.set('trust proxy', 1);

  app.use(helmet());

  // Serve APK files from public/apk directory (for auto-update)
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/files' });

  // Android App Links proof — must be reachable WITHOUT the /api prefix:
  // https://hawkaerosystem.com/.well-known/assetlinks.json
  // Nginx/proxy alternative: rewrite ^/\.well-known/(.*)$ to /files/.well-known/$1
  app.useStaticAssets(join(process.cwd(), 'public', '.well-known'), {
    prefix: '/.well-known',
  });

  /*app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN')?.split(',') ||
      (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('CORS_ORIGIN must be configured for production'); })()
        : ['*']),
    credentials: true,
  });*/

  // Default CORS origins must include every origin that serves the web app,
  // otherwise browser fetch() calls (e.g. the /r/:code invite landing on :8081
  // resolving codes against this API on :3000) get blocked. Prefer setting
  // CORS_ORIGIN env (comma-separated) on the server instead of editing this.
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN')?.split(',') || [
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://192.168.1.7:3002',
      //'http://192.168.1.7:3001',
      'http://10.20.75.147:3000',
      'http://43.205.190.95:8081',
      'http://ec2-65-2-121-138.ap-south-1.compute.amazonaws.com:8081',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  if (configService.get<string>('NODE_ENV', 'development') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Hawk Super App Backend')
      .setDescription('Phase 1 API foundation for the Hawk Aerosystem Super App backend.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port, '0.0.0.0');

  Logger.log(`Backend listening on port ${port} (all interfaces)`, 'Bootstrap');
}

void bootstrap();
