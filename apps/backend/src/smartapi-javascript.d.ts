declare module 'smartapi-javascript' {
  export class SmartAPI {
    constructor(config: { api_key: string });
    generateSession(clientCode: string, password?: string, totp?: string): Promise<any>;
    /** Historical candles. Dates are IST "YYYY-MM-DD HH:mm". data rows: [isoTime, o, h, l, c, v]. */
    getCandleData(params: {
      exchange: string;
      symboltoken: string;
      interval: string;
      fromdate: string;
      todate: string;
    }): Promise<{ status: boolean; message?: string; errorcode?: string; data: [string, number, number, number, number, number][] | null }>;
  }

  export class WebSocketV2 {
    constructor(config: {
      jwttoken: string;
      apikey: string;
      clientcode: string;
      feedtype: string;
    });
    connect(): Promise<void>;
    fetchData(request: any): void;
    on(event: string, callback: (...args: any[]) => void): void;
    close(): void;
  }
}
