import dotenv from 'dotenv';
dotenv.config();

export const config = {
  angelOne: {
    apiKey: process.env.ANGEL_ONE_API_KEY || '',
    clientCode: process.env.ANGEL_ONE_CLIENT_ID || '',
    password: process.env.ANGEL_ONE_PASSWORD || '',
    totpSecret: process.env.ANGEL_ONE_TOTP_SECRET || '',
    restUrl: process.env.ANGEL_ONE_REST_URL || 'https://apiconnect.angelbroking.com',
    socketUrl: process.env.ANGEL_ONE_SOCKET_URL || 'wss://smartapisocket.angelone.in/smart-stream'
  }
};
