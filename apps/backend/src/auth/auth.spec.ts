import { describe, expect, it, beforeAll } from 'vitest';
import { ExecutionContext, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { AuthGuard } from './auth.guard.js';
import { AdminGuard, RoleService, ROLE_CACHE_MS } from './admin.guard.js';
import { TicketStore, TICKET_TTL_MS } from './ticketStore.js';
import { TokenVerifier, verifierConfigFromEnv } from './tokenVerifier.js';
import { IS_PUBLIC, SSE_AUTH } from './decorators.js';

const SUPA = 'https://proj.supabase.co';
let privateKey: CryptoKey;
let verifier: TokenVerifier;

beforeAll(async () => {
  const kp = await generateKeyPair('ES256');
  privateKey = kp.privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(kp.publicKey)), kid: 'k1', alg: 'ES256' };
  verifier = new TokenVerifier({ supabaseUrl: SUPA, jwksUrl: `${SUPA}/auth/v1/.well-known/jwks.json` }, createLocalJWKSet({ keys: [jwk] }));
});

async function token(over: { iss?: string; aud?: string; exp?: number; sub?: string } = {}) {
  return new SignJWT({ email: 'me@x.com' })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setSubject(over.sub ?? 'user-1')
    .setIssuer(over.iss ?? `${SUPA}/auth/v1`)
    .setAudience(over.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(over.exp ?? Math.floor(Date.now() / 1000) + 3600)
    .sign(privateKey);
}

function ctx(req: any, meta: Record<string, boolean> = {}, type = 'http') {
  const handler = () => undefined;
  for (const [k, v] of Object.entries(meta)) Reflect.defineMetadata(k, v, handler);
  return {
    getType: () => type,
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const guard = (tickets = new TicketStore()) => new AuthGuard(new Reflector(), verifier, tickets);

describe('AuthGuard (spec 0021 AC-4, AC-6)', () => {
  it('accepts a valid bearer token and attaches the user', async () => {
    const req: any = { method: 'GET', headers: { authorization: `Bearer ${await token()}` } };
    await expect(guard().canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toMatchObject({ id: 'user-1', email: 'me@x.com' });
  });

  it('401s with no token, a wrong issuer, a wrong audience, or an expired token', async () => {
    const g = guard();
    await expect(g.canActivate(ctx({ method: 'GET', headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
    for (const t of [await token({ iss: 'https://evil/auth/v1' }), await token({ aud: 'anon' }), await token({ exp: Math.floor(Date.now() / 1000) - 60 })]) {
      await expect(g.canActivate(ctx({ method: 'GET', headers: { authorization: `Bearer ${t}` } }))).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('lets public routes, preflight OPTIONS, and non HTTP contexts through', async () => {
    const g = guard();
    await expect(g.canActivate(ctx({ method: 'GET', headers: {} }, { [IS_PUBLIC]: true }))).resolves.toBe(true);
    await expect(g.canActivate(ctx({ method: 'OPTIONS', headers: {} }))).resolves.toBe(true);
    await expect(g.canActivate(ctx({}, {}, 'rpc'))).resolves.toBe(true);
  });

  it('SSE routes take a single use ticket and never a raw token in the query', async () => {
    const tickets = new TicketStore();
    const g = guard(tickets);
    const t = tickets.issue({ id: 'user-1', email: null, exp: Math.floor(Date.now() / 1000) + 3600 });
    await expect(g.canActivate(ctx({ method: 'GET', query: { ticket: t } }, { [SSE_AUTH]: true }))).resolves.toBe(true);
    await expect(g.canActivate(ctx({ method: 'GET', query: { ticket: t } }, { [SSE_AUTH]: true }))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(g.canActivate(ctx({ method: 'GET', query: { access_token: await token() } }, { [SSE_AUTH]: true }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a query ticket on a normal route is ignored (bearer still required)', async () => {
    const tickets = new TicketStore();
    const t = tickets.issue({ id: 'u', email: null, exp: Math.floor(Date.now() / 1000) + 3600 });
    await expect(guard(tickets).canActivate(ctx({ method: 'GET', headers: {}, query: { ticket: t } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('TicketStore', () => {
  it('expires tickets after 30 s', () => {
    let now = 1_000_000;
    const s = new TicketStore(() => now);
    const t = s.issue({ id: 'u', email: null, exp: now / 1000 + 3600 });
    now += TICKET_TTL_MS + 1;
    expect(s.redeem(t)).toBeNull();
  });
});

describe('AdminGuard and RoleService (spec 0021 AC-7)', () => {
  const supabaseWith = (impl: () => Promise<any>) => ({ client: { auth: { admin: { getUserById: impl } } } }) as any;
  const adminCtx = (id = 'user-1') => ctx({ user: { id } });

  it('allows admins and forbids everyone else', async () => {
    const role = { value: 'admin' as string | undefined };
    const svc = new RoleService(supabaseWith(async () => ({ data: { user: { app_metadata: { role: role.value } } }, error: null })));
    await expect(new AdminGuard(svc).canActivate(adminCtx('a'))).resolves.toBe(true);
    role.value = undefined;
    await expect(new AdminGuard(svc).canActivate(adminCtx('b'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a failed lookup is 503, never access', async () => {
    const svc = new RoleService(supabaseWith(async () => ({ data: null, error: { message: 'down' } })));
    await expect(new AdminGuard(svc).canActivate(adminCtx())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('a removed role takes effect after the 60 s cache', async () => {
    let now = 0;
    let role: string | undefined = 'admin';
    const svc = new RoleService(supabaseWith(async () => ({ data: { user: { app_metadata: { role } } }, error: null })), () => now);
    expect(await svc.isAdmin('u')).toBe(true);
    role = undefined;
    now += ROLE_CACHE_MS - 1;
    expect(await svc.isAdmin('u')).toBe(true);
    now += 2;
    expect(await svc.isAdmin('u')).toBe(false);
  });
});

describe('verifierConfigFromEnv', () => {
  it('refuses a JWKS URL that does not match SUPABASE_URL', () => {
    expect(() => verifierConfigFromEnv({ SUPABASE_URL: SUPA, SUPABASE_JWKS_URL: 'https://other/jwks.json' } as any)).toThrow(/must be/);
    expect(verifierConfigFromEnv({ SUPABASE_URL: `${SUPA}/`, SUPABASE_JWKS_URL: `${SUPA}/auth/v1/.well-known/jwks.json` } as any).supabaseUrl).toBe(SUPA);
  });
});
