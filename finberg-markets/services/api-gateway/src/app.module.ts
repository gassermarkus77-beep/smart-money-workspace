import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MarketModule } from './modules/market/market.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport: process.env['NODE_ENV'] === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true } },
        redact: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1_000,   limit: 30 },     // 30 req/sec/ip
      { name: 'medium', ttl: 60_000,  limit: 600 },    // 600 req/min/ip
      { name: 'long',   ttl: 3_600_000, limit: 10_000 }, // 10k req/hour/ip
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    MarketModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
