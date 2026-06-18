import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginRequestSchema, SignupRequestSchema, type LoginRequest, type SignupRequest, type TokenPair, type User } from '@finberg/shared/auth';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create an account' })
  @UsePipes(new ZodValidationPipe(SignupRequestSchema))
  signup(@Body() body: SignupRequest): Promise<{ user: User; tokens: TokenPair }> {
    return this.auth.signup(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a token pair' })
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  login(@Body() body: LoginRequest): Promise<{ user: User; tokens: TokenPair }> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string): Promise<TokenPair> {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body('refreshToken') refreshToken: string): Promise<void> {
    return this.auth.logout(refreshToken);
  }
}
