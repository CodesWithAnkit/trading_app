import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from './supabase.service.js';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('initializes client when credentials exist', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'secret';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    expect(service.client).toBeDefined();
    expect(service.client).not.toBeNull();
  });

  it('leaves client null when credentials missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    expect(service.client).toBeNull();
  });
});
