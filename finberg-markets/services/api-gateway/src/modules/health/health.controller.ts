import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ prefix: 'finberg_gateway_' });

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('healthz')
  health(): { status: string; uptime: number; ts: string } {
    return { status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() };
  }

  @Get('readyz')
  ready(): { status: string } {
    // TODO: check dependencies (db, redis, kafka)
    return { status: 'ready' };
  }

  @Get('metrics')
  @Header('Content-Type', register.contentType)
  async metrics(): Promise<string> {
    return register.metrics();
  }
}
