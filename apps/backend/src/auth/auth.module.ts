import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, TOKEN_VERIFIER } from './auth.guard.js';
import { AdminGuard, RoleService } from './admin.guard.js';
import { AuthController } from './auth.controller.js';
import { TicketStore } from './ticketStore.js';
import { TokenVerifier, verifierConfigFromEnv } from './tokenVerifier.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    { provide: TOKEN_VERIFIER, useFactory: () => new TokenVerifier(verifierConfigFromEnv()) },
    { provide: TicketStore, useFactory: () => new TicketStore() },
    { provide: RoleService, useFactory: (s: SupabaseService) => new RoleService(s), inject: [SupabaseService] },
    AdminGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AdminGuard, RoleService, TicketStore],
})
export class AuthModule {}
