import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AngelOneMarketDataProvider } from './AngelOneMarketDataProvider.js';

vi.mock('smartapi-javascript', () => {
  return {
    SmartAPI: class {
      generateSession = vi.fn().mockResolvedValue({
        data: { feedToken: 'mock-feed-token', jwtToken: 'mock-jwt-token' }
      });
      gainersLosers = vi.fn();
      searchScrip = vi.fn();
      getCandleData = vi.fn();
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

  it('parses historical 1m candles and logs in again once on an auth error (covers 0009 AC-15)', async () => {
    const api = (provider as any).smartApi;
    api.getCandleData
      .mockResolvedValueOnce({ status: false, errorcode: 'AG8001', message: 'Invalid Token' })
      .mockResolvedValueOnce({ status: true, data: [['2026-09-29T09:15:00+05:30', 100, 101, 99, 100.5, 1200]] });

    const candles = await provider.getCandles1m('2885', new Date(), new Date());

    expect(api.generateSession).toHaveBeenCalledTimes(1);
    expect(api.getCandleData.mock.calls[0][0]).toMatchObject({ exchange: 'NSE', symboltoken: '2885', interval: 'ONE_MINUTE' });
    expect(candles).toEqual([{ startTime: new Date('2026-09-29T03:45:00Z'), open: 100, high: 101, low: 99, close: 100.5, volume: 1200 }]);
  });

  it('surfaces a failed REST call as an error', async () => {
    (provider as any).smartApi.gainersLosers.mockResolvedValue({ status: false, errorcode: 'AB2001', message: 'Internal error' });
    await expect(provider.fetchFnoPriceGainers()).rejects.toThrow('AB2001');
  });

  it('reports an Angel error payload with no status flag instead of treating it as empty (AG8004)', async () => {
    (provider as any).smartApi.getCandleData.mockResolvedValue({ success: false, message: 'Invalid API Key', errorCode: 'AG8004', data: '' });
    await expect(provider.getCandles1m('2885', new Date(), new Date())).rejects.toThrow('AG8004 Invalid API Key');
    (provider as any).smartApi.searchScrip.mockResolvedValue({ message: 'Invalid API Key', data: '' });
    await expect(provider.searchScrip('M&M')).rejects.toThrow('Invalid API Key');
  });
});
