import { Tick } from './types.js';
import { FeedStatus } from '../angel-one/socket.js';

export class FeedQualityGate {
  private lastTickMs: number = 0;
  private currentStatus: FeedStatus = 'DISCONNECTED';
  
  public onStatusChange?: (status: FeedStatus) => void;

  public processTick(tick: Tick): boolean {
    const now = Date.now();
    this.lastTickMs = now;
    
    // Calculate latency (difference between tick timestamp and system time)
    const latency = now - tick.timestamp;
    
    let newStatus: FeedStatus = 'LIVE';
    
    if (latency > 60000) {
      // Tick is older than 60 seconds
      newStatus = 'STALE';
    } else if (latency > 5000) {
      // Tick is older than 5 seconds
      newStatus = 'DELAYED';
    }

    if (newStatus !== this.currentStatus) {
      this.currentStatus = newStatus;
      if (this.onStatusChange) {
        this.onStatusChange(newStatus);
      }
    }

    // Only allow LIVE or DELAYED ticks to proceed to aggregation
    // If it's completely STALE, drop it to avoid messing up real-time signals
    return newStatus === 'LIVE' || newStatus === 'DELAYED';
  }

  public getStatus(): FeedStatus {
    // Check if we haven't received a tick in a long time (feed died silently)
    const now = Date.now();
    if (this.lastTickMs > 0 && now - this.lastTickMs > 120000) {
      return 'STALE';
    }
    return this.currentStatus;
  }
}
