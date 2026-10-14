import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  BulkBlockDealContract,
  InstitutionalContextContract,
  InstitutionalFlowContract,
} from './contracts/intelligence.contract.js';

const SEED_INSTITUTIONAL_FLOW: InstitutionalFlowContract = {
  reportDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  fiiGrossBuyCr: 12450.80,
  fiiGrossSellCr: 11030.30,
  fiiNetCr: 1420.50,
  diiGrossBuyCr: 9840.40,
  diiGrossSellCr: 8980.20,
  diiNetCr: 860.20,
  reportingPeriod: 'PREVIOUS_DAY_EOD',
  disclaimer: 'Delayed End of Day regulatory disclosure. Never mistake historical institutional position filing for live intraday order flow.',
};

const SEED_BULK_DEALS: BulkBlockDealContract[] = [
  {
    id: 'deal-001',
    dealDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dealTime: '15:15:00',
    symbol: 'TATASTEEL',
    clientName: 'SOCIETE GENERALE',
    dealType: 'BLOCK',
    action: 'BUY',
    quantity: 4500000,
    price: 158.40,
    valueInCrores: 71.28,
    source: 'NSE',
  },
  {
    id: 'deal-002',
    dealDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dealTime: '14:48:20',
    symbol: 'HDFCBANK',
    clientName: 'NPS TRUST - A/C SBI PENSION FUND SCHEME',
    dealType: 'BULK',
    action: 'BUY',
    quantity: 1200000,
    price: 1672.50,
    valueInCrores: 200.70,
    source: 'NSE',
  },
  {
    id: 'deal-003',
    dealDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dealTime: '11:20:15',
    symbol: 'RELIANCE',
    clientName: 'GOLDMAN SACHS SINGAPORE PTE',
    dealType: 'BLOCK',
    action: 'BUY',
    quantity: 850000,
    price: 2940.00,
    valueInCrores: 249.90,
    source: 'NSE',
  },
  {
    id: 'deal-004',
    dealDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    dealTime: '15:05:10',
    symbol: 'INFOSYS',
    clientName: 'VANGUARD TOTAL INTERNATIONAL STOCK INDEX FUND',
    dealType: 'BULK',
    action: 'SELL',
    quantity: 650000,
    price: 1885.25,
    valueInCrores: 122.54,
    source: 'NSE',
  },
];

@Injectable()
export class InstitutionalContextService {
  private readonly logger = new Logger(InstitutionalContextService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieves delayed EOD institutional flows and bulk deal reports.
   */
  async getInstitutionalContext(): Promise<InstitutionalContextContract> {
    let flows: InstitutionalFlowContract = SEED_INSTITUTIONAL_FLOW;
    let deals: BulkBlockDealContract[] = SEED_BULK_DEALS;

    if (this.supabase.client) {
      try {
        const { data: flowData } = await this.supabase.client
          .from('institutional_flows')
          .select('*')
          .order('report_date', { ascending: false })
          .limit(1);

        if (flowData && flowData.length > 0) {
          const row = flowData[0];
          flows = {
            reportDate: row.report_date,
            fiiGrossBuyCr: Number(row.fii_gross_buy),
            fiiGrossSellCr: Number(row.fii_gross_sell),
            fiiNetCr: Number(row.fii_net),
            diiGrossBuyCr: Number(row.dii_gross_buy),
            diiGrossSellCr: Number(row.dii_gross_sell),
            diiNetCr: Number(row.dii_net),
            reportingPeriod: row.reporting_period || 'PREVIOUS_DAY_EOD',
            disclaimer: 'Delayed End of Day regulatory disclosure. Never mistake historical institutional position filing for live intraday order flow.',
          };
        }

        const { data: dealsData } = await this.supabase.client
          .from('bulk_block_deals')
          .select('*')
          .order('deal_date', { ascending: false })
          .limit(20);

        if (dealsData && dealsData.length > 0) {
          deals = dealsData.map(row => ({
            id: row.id,
            dealDate: row.deal_date,
            dealTime: row.deal_time,
            symbol: row.symbol,
            clientName: row.client_name,
            dealType: row.deal_type,
            action: row.action,
            quantity: Number(row.quantity),
            price: Number(row.price),
            valueInCrores: Number(row.value_in_crores),
            source: row.source || 'NSE',
          }));
        }
      } catch (err: any) {
        this.logger.warn(`Failed reading institutional context from Supabase: ${err?.message || err}`);
      }
    }

    return {
      flows,
      recentDeals: deals,
      disclaimer: flows.disclaimer,
    };
  }

  /**
   * Records daily institutional turnover into Supabase.
   */
  async recordDailyFlow(flow: InstitutionalFlowContract): Promise<void> {
    if (!this.supabase.client) return;

    try {
      await this.supabase.client.from('institutional_flows').upsert({
        report_date: flow.reportDate,
        fii_gross_buy: flow.fiiGrossBuyCr,
        fii_gross_sell: flow.fiiGrossSellCr,
        fii_net: flow.fiiNetCr,
        dii_gross_buy: flow.diiGrossBuyCr,
        dii_gross_sell: flow.diiGrossSellCr,
        dii_net: flow.diiNetCr,
        reporting_period: flow.reportingPeriod,
      }, { onConflict: 'report_date' });
    } catch (err: any) {
      this.logger.error(`Error saving daily institutional flow: ${err?.message || err}`);
    }
  }
}
