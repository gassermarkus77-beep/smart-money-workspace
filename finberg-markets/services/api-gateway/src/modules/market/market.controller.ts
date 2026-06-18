import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BarRangeRequestSchema, type Bar, type BarRangeRequest } from '@finberg/shared/market';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { MarketService } from './market.service.js';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('bars')
  @ApiOperation({ summary: 'Fetch historical OHLCV bars' })
  @UsePipes(new ZodValidationPipe(BarRangeRequestSchema))
  bars(@Query() query: BarRangeRequest): Promise<Bar[]> {
    return this.market.getBars(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search instruments by symbol or name' })
  search(@Query('q') q: string): Promise<Array<{ symbol: string; name: string; exchange: string; assetClass: string }>> {
    return this.market.search(q);
  }
}
