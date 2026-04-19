// Live crypto prices via CoinGecko public API (no key required).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
];

const FALLBACK = COINS.map((c, i) => ({
  ...c,
  price_eur: [62000, 3100, 145, 0.45, 0.52, 7.2, 14, 38][i],
  change_24h: [1.2, -0.8, 3.1, 0.5, -1.4, 2.0, 0.9, -2.1][i],
}));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ids = COINS.map((c) => c.id).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const j = await r.json();
    const out = COINS.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      price_eur: j[c.id]?.eur ?? 0,
      change_24h: j[c.id]?.eur_24h_change ?? 0,
    }));
    return new Response(JSON.stringify({ coins: out, ts: Date.now() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ coins: FALLBACK, ts: Date.now(), fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
