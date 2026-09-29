import { MarketTick } from './types.js';

export class TickNormalizer {
  // Mapping of instrument tokens to symbols. In a real app this would be injected or loaded from DB.
  private tokenToSymbol: Record<string, string> = {
    '26009': 'NIFTY BANK',
    '26000': 'NIFTY 50'
  };

  /**
   * Normalize an incoming tick from SmartAPI WebSocketV2.
   * According to SmartAPI documentation, the raw payload has varying structures depending on mode,
   * but typically includes token, last_traded_price, exchange_timestamp, etc.
   */
  public normalize(raw: any): MarketTick | null {
    if (!raw) return null;

    // SmartAPI WebSocket V2 payload typically has:
    // token, exchangeType, last_traded_price (ltp), exchange_timestamp, last_traded_quantity (vol)

    // The js SDK parses the binary buffer into a JSON object automatically.
    let tokenStr = String(raw.token);
    // Remove extra quotes if any
    tokenStr = tokenStr.replace(/^"|"$/g, '');
    const token = tokenStr;
    if (!token) return null;

    let ltpRaw = raw.last_traded_price;
    if (typeof ltpRaw === 'string') {
      ltpRaw = Number(ltpRaw) / 100; // It is scaled by 100
    }
    const ltp = Number(ltpRaw);
    if (isNaN(ltp) || ltp <= 0) return null;

    // Time: SDK returns exchange_timestamp in milliseconds since epoch usually, 
    // or as a standard timestamp. We must ensure it's a valid date.
    let date: Date;
    if (raw.exchange_timestamp) {
      // Assuming it's in milliseconds
      date = new Date(Number(raw.exchange_timestamp));
    } else {
      date = new Date();
    }
    
    if (isNaN(date.getTime())) return null;

    return {
      instrumentToken: token,
      exchange: 'NSE',
      symbol: this.tokenToSymbol[token] || `UNKNOWN_${token}`,
      ltp: ltp,
      timestamp: date,
      volume: raw.last_traded_quantity || raw.volume || 0,
      open: raw.open_price_of_the_day,
      high: raw.high_price_of_the_day,
      low: raw.low_price_of_the_day,
      close: raw.close_price_of_the_day,
      rawTimestamp: raw.exchange_timestamp ? Number(raw.exchange_timestamp) : Date.now()
    };
  }
}
