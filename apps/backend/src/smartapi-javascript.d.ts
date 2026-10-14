declare module 'smartapi-javascript' {
  export class SmartAPI {
    constructor(config: { api_key: string });
    generateSession(clientCode: string, password?: string, totp?: string): Promise<any>;
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
