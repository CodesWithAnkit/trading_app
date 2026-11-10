import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  BulkBlockDealContract,
  InstitutionalContextContract,
  InstitutionalFlowContract,
} from './contracts/intelligence.contract.js';

/** Shown on every institutional figure: these are delayed end of day filings, not live flow. */
export const INSTITUTIONAL_DISCLAIMER =
  'Delayed End of Day regulatory disclosure. Never mistake historical institutional position filing for live intraday order flow.';

@Injectable()
export class InstitutionalContextService {
  private readonly logger = new Logger(InstitutionalContextService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieves delayed EOD institutional flows and bulk deal reports.
   */
  async getInstitutionalContext(): Promise<InstitutionalContextContract> {
    // spec 0026 AC-7: no seed figures; empty until a real source writes rows.
    let flows: InstitutionalFlowContract | null = null;
    let deals: BulkBlockDealContract[] = [];

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
            disclaimer: INSTITUTIONAL_DISCLAIMER,
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
      disclaimer: INSTITUTIONAL_DISCLAIMER,
      connected: flows !== null || deals.length > 0,
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
