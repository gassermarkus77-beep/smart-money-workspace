import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(): { todo: string } {
    // TODO: extract from JWT via AuthGuard; proxy to users service
    return { todo: 'wire AuthGuard + users service gRPC client' };
  }
}
