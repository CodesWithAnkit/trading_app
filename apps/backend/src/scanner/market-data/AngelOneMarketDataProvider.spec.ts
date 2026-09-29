import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AngelOneMarketDataProvider } from './AngelOneMarketDataProvider.js';

vi.mock('smartapi-javascript', () => {
  return {
    SmartAPI: class {
      generateSession = vi.fn().mockResolvedValue({
        data: { feedToken: 'mock-feed-token', jwtToken: 'mock-jwt-token' }
      });
    },
    WebSocketV2: class {
      connect = vi.fn().mockResolvedValue(true);
      on = vi.fn();
      fetchData = vi.fn();
    }
  };
});

describe('AngelOneMarketDataProvider', () => {
  let provider: AngelOneMarketDataProvider;

  beforeEach(() => {
    provider = new AngelOneMarketDataProvider({
      apiKey: 'test-key',
      clientCode: 'test-client',
      totpSecret: 'ABCDEFGHIJ'
    });
  });

  it('connects and authenticates with Angel One (covers AC-1)', async () => {
    await provider.connect();
    const health = provider.getHealth();
    
    // Status should transition to CONNECTED on success
    expect(health.status).toBe('CONNECTED');
    expect(health.connectionStartedAt).not.toBeNull();
  });

  it('updates subscriptions correctly (covers AC-2)', async () => {
    await provider.connect();
    
    const subs = [
      { exchangeType: '1', tokens: ['26000', '26009'] }
    ];
    
    provider.subscribe(subs);
    
    const health = provider.getHealth();
    expect(health.subscribedInstrumentCount).toBe(2);
  });

  it('disconnects and clears resources', async () => {
    await provider.connect();
    await provider.disconnect();
    
    const health = provider.getHealth();
    expect(health.status).toBe('DISCONNECTED');
  });
});
