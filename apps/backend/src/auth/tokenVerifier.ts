import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';
import { AuthUser } from './decorators.js';

export type VerifierConfig = { supabaseUrl: string; jwksUrl: string };

/** Reads and checks the env at startup (spec 0021 AC-4): refuses to boot on a mismatched JWKS URL. */
export function verifierConfigFromEnv(env = process.env): VerifierConfig {
  const supabaseUrl = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const jwksUrl = env.SUPABASE_JWKS_URL || '';
  if (!supabaseUrl || !jwksUrl) throw new Error('Auth: SUPABASE_URL and SUPABASE_JWKS_URL must be set.');
  const expected = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  if (jwksUrl !== expected) throw new Error(`Auth: SUPABASE_JWKS_URL must be ${expected}`);
  return { supabaseUrl, jwksUrl };
}

/** Verifies a Supabase access token with pinned issuer, audience and algorithms. */
export class TokenVerifier {
  private readonly keys: JWTVerifyGetKey;
  private readonly issuer: string;

  constructor(cfg: VerifierConfig, keys?: JWTVerifyGetKey) {
    this.keys = keys ?? createRemoteJWKSet(new URL(cfg.jwksUrl));
    this.issuer = `${cfg.supabaseUrl}/auth/v1`;
  }

  async verify(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.issuer,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
      clockTolerance: 5,
    });
    if (!payload.sub || !payload.exp) throw new Error('Token missing sub or exp');
    return { id: payload.sub, email: (payload.email as string) ?? null, exp: payload.exp };
  }
}
