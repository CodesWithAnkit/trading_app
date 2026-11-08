import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, SSE_AUTH } from './decorators.js';
import { TokenVerifier } from './tokenVerifier.js';
import { TicketStore } from './ticketStore.js';

export const TOKEN_VERIFIER = 'TOKEN_VERIFIER';

/** Global guard (spec 0021 AC-4, AC-6): every HTTP route needs a verified Supabase token unless @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly tickets: TicketStore,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest();
    if (req.method === 'OPTIONS') return true;
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    if (this.reflector.getAllAndOverride<boolean>(SSE_AUTH, targets)) {
      const ticket = typeof req.query?.ticket === 'string' ? req.query.ticket : '';
      const user = ticket ? this.tickets.redeem(ticket) : null;
      if (!user) throw new UnauthorizedException('Invalid or expired stream ticket');
      req.user = user;
      return true;
    }

    const header: string = req.headers?.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Sign in required');
    try {
      req.user = await this.verifier.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
