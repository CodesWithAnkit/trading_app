import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC = 'auth:public';
export const SSE_AUTH = 'auth:sse';

/** Route needs no sign in (spec 0021 AC-4: only `/` and `/health`). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** SSE route: authenticates with a single use `?ticket=` instead of a bearer header (AC-6). */
export const SseAuth = () => SetMetadata(SSE_AUTH, true);

export type AuthUser = { id: string; email: string | null; exp: number };

/** The verified user the AuthGuard attached to the request. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
