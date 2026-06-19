import { z } from 'zod';
import { USER_ROLES, type UserRole } from './constants';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  username: z.string().min(2).max(32).nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: z.enum(USER_ROLES),
  country: z.string().length(2).nullable(),
  timezone: z.string().default('UTC'),
  locale: z.string().default('en-US'),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().default(false),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),       // seconds
  tokenType: z.literal('Bearer'),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const JwtClaimsSchema = z.object({
  sub: z.string().uuid(),            // user id
  iss: z.string(),
  aud: z.string(),
  exp: z.number().int(),
  iat: z.number().int(),
  jti: z.string().uuid(),
  role: z.enum(USER_ROLES),
  scopes: z.array(z.string()).default([]),
  orgs: z.array(z.string().uuid()).default([]),
});
export type JwtClaims = z.infer<typeof JwtClaimsSchema>;

export type { UserRole };
