// Manual end-of-day outcome reconciliation, for backfills and reruns (AC-8).
// Usage: npm run scanner:reconcile -- [YYYY-MM-DD]   (defaults to today, IST)
import { SupabaseService } from '../supabase/supabase.service.js';
import { reconcileOutcomes } from './outcomes/reconcileOutcomes.js';
import { istDateString, isValidDateString } from './time/ist.js';

async function main() {
  const date = process.argv[2] || istDateString();
  if (!isValidDateString(date)) {
    console.error(`Invalid date "${date}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const { client } = new SupabaseService();
  if (!client) {
    console.error('Missing Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  const { reconciled, skipped } = await reconcileOutcomes(client, date);
  console.log(`Reconciled ${reconciled} signal(s) for ${date}; skipped ${skipped}.`);
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
