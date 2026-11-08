import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from './decorators.js';
import type { AuthUser } from './decorators.js';
import { RoleService } from './admin.guard.js';
import { TICKET_TTL_MS, TicketStore } from './ticketStore.js';

@Controller('api/v1')
export class AuthController {
  constructor(private readonly roles: RoleService, private readonly tickets: TicketStore) {}

  /** spec 0021: who am I. isAdmin mirrors the server side role. */
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return { id: user.id, email: user.email, isAdmin: await this.roles.isAdmin(user.id) };
  }

  /** spec 0021 AC-6: a 30 s single use ticket for EventSource, which cannot send headers. */
  @Post('auth/sse-ticket')
  @HttpCode(200)
  sseTicket(@CurrentUser() user: AuthUser) {
    return { ticket: this.tickets.issue(user), expiresIn: TICKET_TTL_MS / 1000 };
  }
}
