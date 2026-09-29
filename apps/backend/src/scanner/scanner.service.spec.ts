import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScannerService } from './scanner.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';

// Mock the provider to avoid actual connections
vi.mock('./market-data/AngelOneMarketDataProvider.js', () => {
  return {
    AngelOneMarketDataProvider: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(true),
      subscribe: vi.fn(),
      onTick: vi.fn(),
      getHealth: vi.fn().mockReturnValue({ status: 'CONNECTED', reconnectCount: 0 })
    }))
  };
});

describe('ScannerService', () => {
  let service: ScannerService;
  let supabaseMock: any;

  beforeEach(() => {
    supabaseMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null })
      }
    };
    
    service = new ScannerService(supabaseMock as any);
    // Suppress logs in tests
    vi.spyOn(service['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'error').mockImplementation(() => {});
    vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});
  });

  it('flushes feed health to supabase (covers AC-6)', async () => {
    // Override the mock to return a specific state
    (AngelOneMarketDataProvider as Mock).mockImplementation(() => ({
      getHealth: vi.fn().mockReturnValue({ status: 'RECONNECTING', reconnectCount: 3 })
    }));
    
    // Mock provider directly on service instance
    (service as any).provider = {
      getHealth: vi.fn().mockReturnValue({ status: 'RECONNECTING', reconnectCount: 3 })
    };
    
    // Call the private flushHealth manually for testing
    await (service as any).flushHealth();
    
    expect(supabaseMock.client.from).toHaveBeenCalledWith('feed_health');
    expect(supabaseMock.client.insert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'RECONNECTING',
      reconnect_count: 3
    }));
  });
});
