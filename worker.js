/* I.F.I.A — keep-alive cron for the Supabase FREE project.
 *
 * Supabase pauses free projects after ~7 days with no database activity.
 * This runs once a day and issues a real SELECT against Postgres, which
 * counts as activity and prevents the pause. $0.
 *
 * Setup (Cloudflare dashboard, no wrangler needed):
 *   Workers & Pages -> Create -> Create Worker -> name: ifiia-keepalive
 *   Edit code -> paste this file -> Deploy
 *   Settings -> Triggers -> Cron Triggers -> Add -> "0 3 * * *" (daily 03:00 UTC)
 */

const SUPABASE_URL = 'https://nogkagjuubrupybnoqib.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qc2Ob642yIlOKiWVApWvkw_CzquviZl';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(keepAlive());
  },

  async fetch() {
    return new Response('ifiia-keepalive: use the cron trigger, not the URL.', { status: 200 });
  }
};

async function keepAlive() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`keepalive failed: ${res.status} ${await res.text()}`);
  }
  console.log(`keepalive ok: ${res.status}`);
}
