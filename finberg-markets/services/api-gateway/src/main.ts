// ============================================================================
// API Gateway — entrypoint
// Boots a Fastify-backed NestJS app, wires Helmet, CORS, Swagger, and starts
// listening on $PORT (default 4000).
// ============================================================================

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: true, bodyLimit: 1_000_000 }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  await app.register(helmet, {
    contentSecurityPolicy: false,        // CSP handled by edge
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('v1');

  const swagger = new DocumentBuilder()
    .setTitle('FINBERG MARKETS API')
    .setDescription('Public + internal API for FINBERG MARKETS.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, doc);

  await app.listen({ port: Number(process.env['PORT'] ?? 4000), host: '0.0.0.0' });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap', err);
  process.exit(1);
});
