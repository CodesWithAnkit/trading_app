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

  it('merges subscriptions in Quote mode and replays the full set on reconnect (covers 0009 AC-12, AC-14)', async () => {
    await provider.connect();
    const socket = (provider as any).webSocket;
    const onConnected = vi.fn();
    provider.onConnected(onConnected);

    await provider.subscribe([{ exchangeType: '1', tokens: ['2885', '3045'] }]);
    await provider.subscribe([{ exchangeType: '1', tokens: ['3045', '2031'] }]);

    expect(provider.getHealth().subscribedInstrumentCount).toBe(3);
    expect(socket.fetchData.mock.calls.map((c: any[]) => [c[0].mode, c[0].tokens])).toEqual([
      [2, ['2885', '3045']],
      [2, ['2031']] // only the new token
    ]);

    (provider as any).handleConnected(); // reconnect
    expect(socket.fetchData.mock.calls.at(-1)[0]).toMatchObject({ mode: 2, tokens: ['2885', '3045', '2031'] });
    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  it('names ticks with the injected symbol resolver', async () => {
    const ticks: any[] = [];
    provider.onTick(t => ticks.push(t));
    provider.setSymbolResolver(token => (token === '2885' ? 'RELIANCE' : undefined));
    (provider as any).handleRawTick({ token: '2885', last_traded_price: '145025', close_price: '141500' });
    expect(ticks[0]).toMatchObject({ symbol: 'RELIANCE', ltp: 1450.25, prevClose: 1415 });
  });

  it('subscribes in chunks of 50 tokens with unique correlation ids, on add and on reconnect (covers 0009 AC-12)', async () => {
    await provider.connect();
    const socket = (provider as any).webSocket;
    const tokens = Array.from({ length: 120 }, (_, i) => String(1000 + i));

    await provider.subscribe([{ exchangeType: '1', tokens }]);
    const first = socket.fetchData.mock.calls.map((c: any[]) => c[0]);
    expect(first.map((r: any) => r.tokens.length)).toEqual([50, 50, 20]);
    expect(new Set(first.map((r: any) => r.correlationID)).size).toBe(3);

    socket.fetchData.mockClear();
    (provider as any).handleConnected(); // reconnect replays the full set in the same chunks
    expect(socket.fetchData.mock.calls.map((c: any[]) => c[0].tokens.length)).toEqual([50, 50, 20]);
  });
});
