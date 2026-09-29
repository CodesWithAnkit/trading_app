import WebSocket from 'ws';
import { config } from '../config.js';

export type FeedStatus = 'DISCONNECTED' | 'CONNECTING' | 'LIVE' | 'DELAYED' | 'STALE';

export class AngelOneSocket {
  private ws: WebSocket | null = null;
  private feedToken: string;
  private clientCode: string;
  private status: FeedStatus = 'DISCONNECTED';
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Callback when a raw tick is received
  public onTick?: (data: Buffer) => void;
  // Callback when feed status changes
  public onStatusChange?: (status: FeedStatus) => void;

  constructor(feedToken: string, clientCode: string) {
    this.feedToken = feedToken;
    this.clientCode = clientCode;
  }

  public connect(): void {
    if (this.status === 'CONNECTING' || this.status === 'LIVE') {
      return;
    }
    
    this.updateStatus('CONNECTING');
    console.log(`Connecting to Angel One WebSocket: ${config.angelOne.socketUrl}`);
    
    try {
      this.ws = new WebSocket(config.angelOne.socketUrl, {
        headers: {
          'Authorization': `Bearer ${this.feedToken}`,
          'x-client-code': this.clientCode,
          'x-feed-token': this.feedToken,
        }
      });

      this.ws.on('open', this.handleOpen.bind(this));
      this.ws.on('message', this.handleMessage.bind(this));
      this.ws.on('close', this.handleClose.bind(this));
      this.ws.on('error', this.handleError.bind(this));
    } catch (err) {
      console.error('Failed to create WebSocket instance', err);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.clearTimers();
    this.updateStatus('DISCONNECTED');
  }

  public subscribe(tokens: { exchangeType: number; tokens: string[] }[]): void {
    if (this.status !== 'LIVE' || !this.ws) {
      console.warn('Cannot subscribe: socket not LIVE');
      return;
    }

    // Angel One SmartStream request format
    const request = {
      correlationID: `sub-${Date.now()}`,
      action: 1, // 1 for subscribe
      params: {
        mode: 1, // 1 for Quote, 2 for SnapQuote, 3 for Full
        tokenList: tokens
      }
    };
    
    this.ws.send(JSON.stringify(request));
    console.log(`Sent subscription request: ${JSON.stringify(tokens)}`);
  }

  private handleOpen(): void {
    console.log('Angel One WebSocket connected');
    this.updateStatus('LIVE');
    
    // Start heartbeat
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000); // 30s ping
  }

  private handleMessage(data: WebSocket.RawData): void {
    // In Angel One Smart Stream, data is usually a binary buffer containing ticks
    if (Buffer.isBuffer(data)) {
      if (this.onTick) {
        this.onTick(data);
      }
    } else if (typeof data === 'string') {
      if (data !== 'pong') {
        console.log('Received text message:', data);
      }
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    console.log(`Angel One WebSocket closed: ${code} - ${reason.toString()}`);
    this.clearTimers();
    this.updateStatus('DISCONNECTED');
    this.scheduleReconnect();
  }

  private handleError(error: Error): void {
    console.error('Angel One WebSocket error:', error.message);
    // Don't change status immediately; let the close event handle reconnects
  }

  private scheduleReconnect(): void {
    this.clearTimers();
    console.log('Scheduling reconnect in 5 seconds...');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private clearTimers(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  private updateStatus(newStatus: FeedStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (this.onStatusChange) {
        this.onStatusChange(this.status);
      }
    }
  }
}
