// ============================================================================
// AuthService — gateway-side facade over the dedicated `auth` microservice.
// In dev it can run inline; in prod it proxies to the `auth` service via gRPC.
// The implementation here is a stub that demonstrates the contract.
// ============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import type { LoginRequest, SignupRequest, TokenPair, User } from '@finberg/shared/auth';

@Injectable()
export class AuthService {
  // TODO: replace with real persistence — Prisma client to the OLTP db.
  private readonly users = new Map<string, { user: User; passwordHash: string }>();
  private readonly refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(private readonly jwt: JwtService) {}

  async signup(req: SignupRequest): Promise<{ user: User; tokens: TokenPair }> {
    if ([...this.users.values()].some(r => r.user.email === req.email)) {
      throw new UnauthorizedException('Email already in use');
    }
    const id = randomUUID();
    const user: User = {
      id,
      email: req.email,
      emailVerified: false,
      username: req.username,
      displayName: req.username,
      avatarUrl: null,
      role: 'free',
      country: null,
      timezone: 'UTC',
      locale: 'en-US',
      createdAt: new Date().toISOString(),
    };
    const passwordHash = this.hashPassword(req.password);
    this.users.set(id, { user, passwordHash });
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async login(req: LoginRequest): Promise<{ user: User; tokens: TokenPair }> {
    const record = [...this.users.values()].find(r => r.user.email === req.email);
    if (!record) throw new UnauthorizedException('Invalid credentials');
    if (record.passwordHash !== this.hashPassword(req.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens(record.user);
    return { user: record.user, tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hashed = createHash('sha256').update(refreshToken).digest('hex');
    const record = this.refreshTokens.get(hashed);
    if (!record || record.expiresAt < Date.now()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    this.refreshTokens.delete(hashed);             // rotate
    const userRec = this.users.get(record.userId);
    if (!userRec) throw new UnauthorizedException('User no longer exists');
    return this.issueTokens(userRec.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const hashed = createHash('sha256').update(refreshToken).digest('hex');
    this.refreshTokens.delete(hashed);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, jti: randomUUID() },
      { expiresIn: '5m' },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const hashed = createHash('sha256').update(refreshToken).digest('hex');
    this.refreshTokens.set(hashed, {
      userId: user.id,
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
    });
    return { accessToken, refreshToken, expiresIn: 300, tokenType: 'Bearer' };
  }

  private hashPassword(pw: string): string {
    // Replace with Argon2id in production — keep this short here only.
    return createHash('sha256').update(pw + (process.env['PASSWORD_PEPPER'] ?? '')).digest('hex');
  }
}
