// Live FX rates via exchangerate.host (no key needed). Falls back to static rates.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACK: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.96, PLN: 4.32,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = "https://api.exchangerate.host/latest?base=EUR&symbols=USD,GBP,CHF,PLN,EUR";
    const r = await fetch(url);
    let rates: Record<string, number> = FALLBACK;
    if (r.ok) {
      const j = await r.json();
      if (j?.rates) rates = { EUR: 1, ...j.rates };
    }
    return new Response(JSON.stringify({ base: "EUR", rates, ts: Date.now() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ base: "EUR", rates: FALLBACK, ts: Date.now() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
