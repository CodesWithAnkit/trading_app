import { AngelOneMarketDataProvider } from './market-data/AngelOneMarketDataProvider.js';
import { CandleAggregator } from './market-data/CandleAggregator.js';
import dotenv from 'dotenv';

// Load environment from backend root
dotenv.config();

async function runSmokeTest() {
  console.log('--- Angel One SmartAPI Smoke Test ---');

  if (!process.env.ANGEL_ONE_API_KEY || !process.env.ANGEL_ONE_CLIENT_ID || !process.env.ANGEL_ONE_TOTP_SECRET) {
    console.error('❌ Missing credentials. Set ANGEL_ONE_API_KEY, ANGEL_ONE_CLIENT_ID, ANGEL_ONE_TOTP_SECRET.');
    process.exit(1);
  }

  const provider = new AngelOneMarketDataProvider({
    apiKey: process.env.ANGEL_ONE_API_KEY,
    clientCode: process.env.ANGEL_ONE_CLIENT_ID,
    password: process.env.ANGEL_ONE_PASSWORD,
    totpSecret: process.env.ANGEL_ONE_TOTP_SECRET,
  });

  const aggregator = new CandleAggregator();

  aggregator.on1mComplete = (candle) => {
    console.log(`[CANDLE 1m] ${candle.symbol}: O=${candle.open} H=${candle.high} L=${candle.low} C=${candle.close} V=${candle.volume}`);
  };

  provider.onTick((tick) => {
    console.log(`[TICK] ${tick.symbol} @ ${tick.ltp} (vol: ${tick.volume})`);
    aggregator.processTick(tick);
  });

  console.log('Connecting...');
  await provider.connect();

  const tokens = process.env.SCANNER_INSTRUMENTS ? process.env.SCANNER_INSTRUMENTS.split(',') : ['26009', '26000'];
  
  setTimeout(() => {
    console.log(`Subscribing to: ${tokens.join(', ')}`);
    provider.subscribe([
      { exchangeType: '1', tokens }
    ]);
  }, 5000);

  // Monitor health periodically
  const healthInterval = setInterval(() => {
    const health = provider.getHealth();
    console.log(`[HEALTH] Status: ${health.status}, Last Tick: ${health.lastTickAt}, Reconnects: ${health.reconnectCount}`);
  }, 10000);

  // Run for 30 seconds then shut down
  setTimeout(async () => {
    console.log('Test complete, disconnecting...');
    clearInterval(healthInterval);
    await provider.disconnect();
    process.exit(0);
  }, 35000);
}

runSmokeTest().catch(console.error);
