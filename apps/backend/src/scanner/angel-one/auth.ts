import axios from 'axios';
import * as OTPAuth from 'otpauth';
import { config } from '../config.js';

export interface AngelAuthSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

export class AngelOneAuth {
  private session: AngelAuthSession | null = null;
  
  public async login(): Promise<AngelAuthSession> {
    if (!config.angelOne.apiKey || !config.angelOne.clientCode) {
      throw new Error('Missing Angel One credentials');
    }
    
    // Generate TOTP
    const totpObj = new OTPAuth.TOTP({
      secret: config.angelOne.totpSecret
    });
    const totp = totpObj.generate();
    
    try {
      const response = await axios.post(
        `${config.angelOne.restUrl}/rest/auth/angelbroking/user/v1/loginByPassword`,
        {
          clientcode: config.angelOne.clientCode,
          password: config.angelOne.password,
          totp
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': '00:00:00:00:00:00',
            'X-PrivateKey': config.angelOne.apiKey
          }
        }
      );
      
      if (response.data && response.data.status) {
        this.session = {
          jwtToken: response.data.data.jwtToken,
          refreshToken: response.data.data.refreshToken,
          feedToken: response.data.data.feedToken
        };
        console.log('Successfully authenticated with Angel One');
        return this.session;
      } else {
        throw new Error(`Login failed: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Angel One Auth error:', error);
      throw error;
    }
  }

  public getSession(): AngelAuthSession | null {
    return this.session;
  }
}
