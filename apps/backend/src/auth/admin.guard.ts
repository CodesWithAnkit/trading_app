import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export const ROLE_CACHE_MS = 60_000;

/**
 * Admin role check (spec 0021 AC-7). Reads app_metadata.role with the service role, cached per user
 * for 60 s (yes and no). A failed lookup is 503: never falls back to the token's own claims.
 */
@Injectable()
export class RoleService {
  private readonly cache = new Map<string, { isAdmin: boolean; at: number }>();

  constructor(private readonly supabase: SupabaseService, private readonly now: () => number = Date.now) {}

  async isAdmin(userId: string): Promise<boolean> {
    const hit = this.cache.get(userId);
    if (hit && this.now() - hit.at < ROLE_CACHE_MS) return hit.isAdmin;
    const client = this.supabase.client;
    if (!client) throw new ServiceUnavailableException('Role lookup unavailable');
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error || !data?.user) throw new ServiceUnavailableException('Role lookup failed');
    const isAdmin = data.user.app_metadata?.role === 'admin';
    this.cache.set(userId, { isAdmin, at: this.now() });
    return isAdmin;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly roles: RoleService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user?.id) throw new ForbiddenException('Admin role required');
    if (!(await this.roles.isAdmin(user.id))) throw new ForbiddenException('Admin role required');
    return true;
  }
}
