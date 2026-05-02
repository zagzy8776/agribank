import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, Loader2, Bitcoin, AlertCircle } from "lucide-react";
import { fmtMoney, fmtNumber, fmtCrypto } from "@/lib/format";
import { toast } from "sonner";
import { getUserAccounts, updateBalance, addTransaction, type Account } from "@/lib/db";
import { useCryptoPrices, type CryptoCoin } from "@/hooks/useCryptoPrices";
import { useCryptoChart, type ChartDataPoint } from "@/hooks/useCryptoChart";

interface Holding { symbol: string; name: string; amount: number; avgBuyPriceEur: number; }

const Crypto = () => {
  const { user } = useAuth();
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [eurAccount, setEurAccount] = useState<Account | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [tradeAmountEur, setTradeAmountEur] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fee, setFee] = useState(0.005); // 0.5% default fee

  const { coins, isLoading: pricesLoading, error: pricesError } = useCryptoPrices();
  const { chartData, isLoading: chartLoading, setDays } = useCryptoChart(selectedCoin?.id || '');

  useEffect(() => {
    if (!user) return;
    getUserAccounts(user.userId).then(accts => {
      setEurAccount(accts.find(a => a.currency === "EUR" && a.is_primary) || accts[0] || null);
    });
    const raw = localStorage.getItem(`crypto_holdings_${user.userId}`);
    setHoldings(raw ? JSON.parse(raw) : []);
  }, [user]);

  const saveHoldings = (h: Holding[]) => { 
    setHoldings(h); 
    localStorage.setItem(`crypto_holdings_${user!.userId}`, JSON.stringify(h)); 
  };

  const portfolioValue = holdings.reduce((s, h) => { 
    const c = coins.find(x => x.symbol === h.symbol); 
    return s + h.amount * (c?.price_eur ?? 0); 
  }, 0);
  const portfolioCost = holdings.reduce((s, h) => s + h.amount * h.avgBuyPriceEur, 0);
  const pnl = portfolioValue - portfolioCost;

  const openTrade = (coin: CryptoCoin, mode: "buy" | "sell") => { 
    setSelectedCoin(coin); 
    setTradeMode(mode); 
    setTradeAmountEur(""); 
    setTradeOpen(true); 
  };

  const submitTrade = () => {
    if (!selectedCoin || !user || !eurAccount) return;
    const amtEur = parseFloat(tradeAmountEur || "0");
    if (!amtEur || amtEur <= 0) { toast.error("Enter an amount"); return; }
    const cents = Math.round(amtEur * 100);
    const feeCents = Math.round(cents * fee);
    const totalCents = cents + (tradeMode === "buy" ? feeCents : 0);
    const cryptoQty = amtEur / selectedCoin.price_eur;
    const existing = holdings.find(h => h.symbol === selectedCoin.symbol);

    if (tradeMode === "buy" && totalCents > eurAccount.balance_cents) { toast.error("Insufficient EUR balance (incl. fee)"); return; }
    if (tradeMode === "sell" && (!existing || existing.amount < cryptoQty)) { toast.error(`Not enough ${selectedCoin.symbol}`); return; }

    setSubmitting(true);
    const newBal = tradeMode === "buy" ? eurAccount.balance_cents - totalCents : eurAccount.balance_cents + cents - feeCents;
    updateBalance(eurAccount.id, newBal).then(() => {
      setEurAccount({ ...eurAccount, balance_cents: newBal });
      let nh = [...holdings];
      if (tradeMode === "buy") {
        if (existing) { 
          const na = existing.amount + cryptoQty; 
          const navg = ((existing.amount * existing.avgBuyPriceEur) + amtEur) / na; 
          nh = nh.map(h => h.symbol === selectedCoin.symbol ? { ...h, amount: na, avgBuyPriceEur: navg } : h); 
        } else { 
          nh.push({ symbol: selectedCoin.symbol, name: selectedCoin.name, amount: cryptoQty, avgBuyPriceEur: selectedCoin.price_eur }); 
        }
      } else {
        const na = existing!.amount - cryptoQty;
        if (na <= 0.0000001) nh = nh.filter(h => h.symbol !== selectedCoin.symbol);
        else nh = nh.map(h => h.symbol === selectedCoin.symbol ? { ...h, amount: na } : h);
      }
      saveHoldings(nh);
      const desc = `${tradeMode === "buy" ? "Buy" : "Sell"} ${fmtCrypto(cryptoQty)} ${selectedCoin.symbol} (fee: ${fmtMoney(feeCents, 'EUR')})`;
      addTransaction({ 
        user_id: user.userId, 
        account_id: eurAccount.id, 
        direction: tradeMode === "buy" ? "debit" : "credit", 
        amount_cents: totalCents, 
        currency: "EUR", 
        description: desc, 
        category: "Crypto", 
        status: "completed" 
      });
      toast.success(`${tradeMode === "buy" ? "Bought" : "Sold"} ${fmtCrypto(cryptoQty)} ${selectedCoin.symbol} (incl. ${fee * 100}% fee)`);
      setTradeOpen(false); 
      setSubmitting(false);
    }).catch(e => { 
      toast.error(e.message || "Trade failed"); 
      setSubmitting(false); 
    });
  };

  const handleCoinClick = (coin: CryptoCoin) => {
    if (selectedCoin?.id === coin.id) setSelectedCoin(null);
    else setSelectedCoin(coin);
  };

  if (pricesError) {
    toast.error("Failed to load crypto prices. Using fallback data.");
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-6xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Digital assets</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Crypto</h1>
          <p className="mt-2 text-muted-foreground">Live prices from CoinGecko. Trade instantly from your EUR account.</p>
        </div>
      </div>

      {/* Portfolio Card */}
      <Card className="mt-8 p-6 sm:p-8 border-border/70 shadow-card overflow-hidden bg-gradient-field text-primary-foreground">
        <p className="text-xs uppercase tracking-[0.22em] opacity-70">Portfolio value</p>
        <div className="mt-3 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-4xl sm:text-5xl">{fmtMoney(Math.round(portfolioValue * 100), "EUR")}</span>
          <span className={`text-sm inline-flex items-center gap-1 ${pnl >= 0 ? "text-accent" : "text-destructive-foreground"}`}>
            {pnl >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {pnl >= 0 ? "+" : ""}{fmtMoney(Math.round(pnl * 100), "EUR")}
          </span>
        </div>
        <p className="mt-2 text-xs opacity-70">Available EUR: {fmtMoney(eurAccount?.balance_cents ?? 0, "EUR")}</p>
      </Card>

      {/* Holdings */}
      {holdings.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-2xl text-primary">Your holdings</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map(h => { 
              const c = coins.find(x => x.symbol === h.symbol); 
              const v = (c?.price_eur ?? 0) * h.amount; 
              const cost = h.avgBuyPriceEur * h.amount; 
              const p = v - cost; 
              return (
                <Card key={h.symbol} className="p-5 border-border/70 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCoinClick(c!)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.symbol}</p>
                    </div>
                    <Bitcoin className="h-5 w-5 text-accent" />
                  </div>
                  <p className="mt-3 font-display text-xl text-primary">{fmtMoney(Math.round(v * 100), "EUR")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtCrypto(h.amount)} {h.symbol}</p>
                  <p className={`mt-1 text-xs ${p >= 0 ? "text-moss" : "text-destructive"}`}>
                    {p >= 0 ? "+" : ""}{fmtMoney(Math.round(p * 100), "EUR")}
                  </p>
                </Card>
              ); 
            })}
          </div>
        </>
      )}

      {/* Chart for Selected Coin */}
      {selectedCoin && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-primary">{selectedCoin.name} Chart</h2>
            <Select value={chartData.length > 0 ? String(useCryptoChart(selectedCoin.id).days) : '7'} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">24h</SelectItem>
                <SelectItem value="7">7d</SelectItem>
                <SelectItem value="30">30d</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="border-border/70">
            <CardContent className="p-0">
              {chartLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [fmtMoney(Math.round(value * 100), 'EUR'), 'Price']} />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market Table */}
      <h2 className="mt-12 font-display text-2xl text-primary">Market</h2>
      <Card className="mt-4 border-border/70 overflow-hidden">
        {pricesLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading live prices...
          </div>
        ) : pricesError ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">Error loading prices. Using fallback.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {coins.map(c => (
              <div key={c.id} className={`flex items-center gap-3 px-5 sm:px-6 py-4 cursor-pointer ${selectedCoin?.id === c.id ? 'bg-secondary/50' : ''}`} onClick={() => handleCoinClick(c)}>
                <div className="grid place-items-center h-10 w-10 rounded-full bg-secondary text-primary shrink-0 font-display text-sm">{c.symbol[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{fmtMoney(Math.round(c.price_eur * 100), "EUR")}</p>
                  <p className={`text-xs ${c.change_24h >= 0 ? "text-moss" : "text-destructive"}`}>
                    {c.change_24h >= 0 ? "+" : ""}{fmtNumber(c.change_24h, 2)}%
                  </p>
                </div>
                <div className="hidden sm:flex gap-2 ml-3">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openTrade(c, "buy"); }}>Buy</Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openTrade(c, "sell"); }}>Sell</Button>
                </div>
                <Button variant="hero" size="sm" className="sm:hidden ml-2" onClick={(e) => { e.stopPropagation(); openTrade(c, "buy"); }}>Trade</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Trade Dialog with Fee */}
      <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {tradeMode === "buy" ? "Buy" : "Sell"} {selectedCoin?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCoin && (
            <div className="space-y-4">
              <Tabs value={tradeMode} onValueChange={(v: "buy" | "sell") => setTradeMode(v)}>
                <TabsList>
                  <TabsTrigger value="buy">Buy</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-sm text-muted-foreground">
                Current price: <span className="text-foreground font-medium">{fmtMoney(Math.round(selectedCoin.price_eur * 100), "EUR")}</span>
              </p>
              <div className="space-y-2">
                <Label>Amount in EUR</Label>
                <Input 
                  inputMode="decimal" 
                  value={tradeAmountEur} 
                  onChange={e => setTradeAmountEur(e.target.value)} 
                  placeholder="100" 
                />
              </div>
              {tradeAmountEur && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    ≈ {fmtCrypto(parseFloat(tradeAmountEur || "0") / selectedCoin.price_eur)} {selectedCoin.symbol}
                  </p>
                  {tradeMode === "buy" && (
                    <p className="text-xs text-destructive">
                      Fee: {fee * 100}% ({fmtMoney(Math.round(parseFloat(tradeAmountEur) * fee * 100), 'EUR')})
                    </p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button 
                  variant="hero" 
                  onClick={submitTrade} 
                  disabled={submitting || !tradeAmountEur}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {tradeMode === "buy" ? "Buy" : "Sell"} {selectedCoin.symbol}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Crypto;

