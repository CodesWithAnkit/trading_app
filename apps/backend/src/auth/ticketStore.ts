import { randomUUID } from 'node:crypto';
import { AuthUser } from './decorators.js';

export const TICKET_TTL_MS = 30_000;

/** Single use SSE tickets (spec 0021 AC-6). In memory: a restart just means clients fetch a new one. */
export class TicketStore {
  private readonly tickets = new Map<string, { user: AuthUser; createdAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  issue(user: AuthUser): string {
    this.sweep();
    const ticket = randomUUID();
    this.tickets.set(ticket, { user, createdAt: this.now() });
    return ticket;
  }

  /** Returns the user once; a second use, an unknown or an expired ticket returns null. */
  redeem(ticket: string): AuthUser | null {
    const entry = this.tickets.get(ticket);
    if (!entry) return null;
    this.tickets.delete(ticket);
    if (this.now() - entry.createdAt > TICKET_TTL_MS) return null;
    if (entry.user.exp * 1000 <= this.now()) return null;
    return entry.user;
  }

  private sweep() {
    const cutoff = this.now() - TICKET_TTL_MS;
    for (const [k, v] of this.tickets) if (v.createdAt < cutoff) this.tickets.delete(k);
  }
}
