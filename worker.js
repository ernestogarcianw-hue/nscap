/**
 * North Star Capital — Cloudflare Worker entry point
 * Handles /meta-capi POST requests; everything else served from static assets
 */
const PIXEL_ID = '1311207484448383';
const CAPI_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: OPTIONS preflight
    if (request.method === 'OPTIONS' && url.pathname === '/meta-capi') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Route: POST /meta-capi — Meta Conversions API relay
    if (request.method === 'POST' && url.pathname === '/meta-capi') {
      return handleCAPI(request, env);
    }

    // Everything else — serve static assets
    return env.ASSETS.fetch(request);
  }
};

async function handleCAPI(request, env) {
  try {
    const token = env.META_CAPI_TOKEN;
    if (!token) return resp({ error: 'META_CAPI_TOKEN secret not configured' }, 500);

    const { event_name, event_id, event_source_url, user_data = {}, custom_data } = await request.json();
    if (!event_name) return resp({ error: 'event_name required' }, 400);

    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ua = request.headers.get('User-Agent') || '';
    const cookies = request.headers.get('Cookie') || '';
    // Prefer values from request body (set by tracker.js), fall back to cookies
    const fbp = user_data.fbp || cookies.match(/_fbp=([^;]+)/)?.[1];
    const fbc = user_data.fbc || cookies.match(/_fbc=([^;]+)/)?.[1];

    const ud = {
      client_ip_address: ip,
      client_user_agent: ua,
      ...(fbp && { fbp }),
      ...(fbc && { fbc }),
    };
    if (user_data.em) ud.em = await sha256(user_data.em.toLowerCase().trim());
    if (user_data.ph) ud.ph = await sha256(user_data.ph.replace(/\D/g, ''));
    if (user_data.fn) ud.fn = await sha256(user_data.fn.toLowerCase().trim());
    if (user_data.ln) ud.ln = await sha256(user_data.ln.toLowerCase().trim());

    const event = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: event_source_url || '',
      user_data: ud,
      ...(event_id && { event_id }),
      ...(custom_data && Object.keys(custom_data).length && { custom_data }),
    };

    const payload = { data: [event] };
    const testCode = env.META_TEST_EVENT_CODE;
    if (testCode) payload.test_event_code = testCode;

    const res = await fetch(`${CAPI_URL}?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return resp(await res.json(), res.status);
  } catch (err) {
    return resp({ error: err.message }, 500);
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function resp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
