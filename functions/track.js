/**
 * North Star Capital — Custom Analytics Pixel
 * Endpoint: POST /track
 *
 * Receives tracking events from the client and writes them to
 * Cloudflare Analytics Engine (dataset: nscap_events).
 *
 * View data: Cloudflare dashboard → Workers & Pages → your project
 *            → Analytics Engine, or query via GraphQL API.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS — allow same-origin only in prod, all origins for local dev
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://nsdevcap.com', 'https://www.nsdevcap.com'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : (origin.includes('localhost') ? origin : 'https://nsdevcap.com');

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400, headers: corsHeaders });
  }

  const {
    event = 'unknown',   // pageview | click | form_submit | time_on_page
    page = '',           // e.g. /pages/fix-and-flip.html
    referrer = '',       // document.referrer
    label = '',          // button text or form id
    duration = 0,        // seconds on page (time_on_page events)
  } = body;

  // Cloudflare provides country from CF-IPCountry header
  const country = request.headers.get('CF-IPCountry') || 'XX';

  // Write to Analytics Engine
  // blobs: string dimensions | doubles: numeric metrics | indexes: high-cardinality key
  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: [event, page, referrer, label, country],
      doubles: [duration],
      indexes: [page],
    });
  }

  return new Response('ok', { status: 200, headers: corsHeaders });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
