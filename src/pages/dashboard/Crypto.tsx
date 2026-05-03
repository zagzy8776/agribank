import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
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
import { getUserAccounts, updateBalance, addTransaction, type Account, createCryptoAccount, getUserCryptoAccounts, transferToCrypto, transferFromCrypto } from "@/lib/db";
import { useCryptoPrices, type CryptoCoin } from "@/hooks/useCryptoPrices";
import { useCryptoChart, type ChartDataPoint } from "@/hooks/useCryptoChart";
import { useCryptoOrderBook, type OrderBook } from "@/hooks/useCryptoOrderBook";

interface Holding { symbol: string; name: string; amount: number; avgBuyPriceEur: number; }

const Crypto = () => {
  const { user } = useAuth();
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [eurAccount, setEurAccount] = useState<Account | null>(null);
  const [cryptoAccounts, setCryptoAccounts] = useState<Account[]>([]);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [tradeAmountEur, setTradeAmountEur] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [slippage, setSlippage] = useState(0.002); // 0.2% default
  const [fee, setFee] = useState(0.005); // 0.5% default fee

  const { coins, isLoading: pricesLoading, error: pricesError } = useCryptoPrices();
  const { chartData, isLoading: chartLoading, setDays } = useCryptoChart(selectedCoin?.id || '');
  const { data: orderBook, isLoading: bookLoading } = useCryptoOrderBook(selectedCoin?.id || '');

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const accts = await getUserAccounts(user.userId);
      setEurAccount(accts.find(a => a.currency === "EUR" && a.is_primary) || accts[0] || null);
      const cryptoAccts = await getUserCryptoAccounts(user.userId);
      setCryptoAccounts(cryptoAccts);
      // Sync holdings with accounts
      const raw = localStorage.getItem(`crypto_holdings_${user.userId}`);
      const localHoldings = raw ? JSON.parse(raw) : [];
      setHoldings(localHoldings);
    };
    loadData();
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
    setOrderType("market");
    setLimitPrice("");
    setTradeAmountEur(""); 
    setTradeOpen(true); 
  };

  const getExecutedPrice = () => {
    if (orderType === "limit") return parseFloat(limitPrice || selectedCoin?.price_eur.toString() || "0");
    // Simulate slippage
    const base = selectedCoin?.price_eur || 0;
    const adjustment = tradeMode === "buy" ? 1 + slippage : 1 - slippage;
    return base * adjustment;
  };

  const submitTrade = async () => {
    if (!selectedCoin || !user || !eurAccount) return;
    const amtEur = parseFloat(tradeAmountEur || "0");
    if (!amtEur || amtEur <= 0) { toast.error("Enter an amount"); return; }
    const executedPrice = getExecutedPrice();
    const cryptoQty = amtEur / executedPrice;
    const existing = holdings.find(h => h.symbol === selectedCoin.symbol);
    const cryptoAccount = cryptoAccounts.find(a => a.currency === selectedCoin.symbol);

    if (tradeMode === "buy" && !cryptoAccount) {
      // Create crypto account if not exists
      await createCryptoAccount(user.userId, selectedCoin.symbol);
      // Reload accounts
      const accts = await getUserCryptoAccounts(user.userId);
      setCryptoAccounts(accts);
    }

    if (tradeMode === "buy" && amtEur > eurAccount.balance_cents / 100) { toast.error("Insufficient EUR balance"); return; }
    if (tradeMode === "sell" && (!existing || existing.amount < cryptoQty)) { toast.error(`Not enough ${selectedCoin.symbol}`); return; }

    setSubmitting(true);
    setProcessing(true);

    // Simulate execution delay
    setTimeout(async () => {
      try {
        const cents = Math.round(amtEur * 100);
        const feeCents = Math.round(cents * fee);
        const totalCents = cents + (tradeMode === "buy" ? feeCents : 0);
        const newBal = tradeMode === "buy" ? eurAccount.balance_cents - totalCents : eurAccount.balance_cents + cents - feeCents;
        await updateBalance(eurAccount.id, newBal);
        setEurAccount({ ...eurAccount, balance_cents: newBal });

        let nh = [...holdings];
        if (tradeMode === "buy") {
          if (existing) { 
            const na = existing.amount + cryptoQty; 
            const navg = ((existing.amount * existing.avgBuyPriceEur) + amtEur) / na; 
            nh = nh.map(h => h.symbol === selectedCoin.symbol ? { ...h, amount: na, avgBuyPriceEur: navg } : h); 
          } else { 
            nh.push({ symbol: selectedCoin.symbol, name: selectedCoin.name, amount: cryptoQty, avgBuyPriceEur: executedPrice }); 
          }
          // Transfer to crypto account
          const cryptoAcc = cryptoAccounts.find(a => a.currency === selectedCoin.symbol) || { id: 'temp' };
          await transferToCrypto(eurAccount.id, cryptoAcc.id, totalCents, selectedCoin.symbol, executedPrice, `Buy ${cryptoQty} ${selectedCoin.symbol}`);
        } else {
          const na = existing!.amount - cryptoQty;
          if (na <= 0.0000001) nh = nh.filter(h => h.symbol !== selectedCoin.symbol);
          else nh = nh.map(h => h.symbol === selectedCoin.symbol ? { ...h, amount: na } : h);
          // Transfer from crypto account
          const cryptoAcc = cryptoAccounts.find(a => a.currency === selectedCoin.symbol) || { id: 'temp' };
          await transferFromCrypto(cryptoAcc.id, eurAccount.id, cryptoQty, selectedCoin.symbol, executedPrice, `Sell ${cryptoQty} ${selectedCoin.symbol}`);
        }
        saveHoldings(nh);
        const desc = `${tradeMode === "buy" ? "Buy" : "Sell"} ${fmtCrypto(cryptoQty)} ${selectedCoin.symbol} at ${fmtMoney(Math.round(executedPrice * 100), 'EUR')} (fee: ${fmtMoney(Math.round(cents * fee * 100), 'EUR')})`;
        await addTransaction({ 
          user_id: user.userId, 
          account_id: eurAccount.id, 
          direction: tradeMode === "buy" ? "debit" : "credit", 
          amount_cents: totalCents, 
          currency: "EUR", 
          description: desc, 
          category: "Crypto", 
          status: "completed" 
        });
        toast.success(`Trade executed! ${tradeMode === "buy" ? "Bought" : "Sold"} ${fmtCrypto(cryptoQty)} ${selectedCoin.symbol} at ${fmtMoney(Math.round(executedPrice * 100), 'EUR')} (incl. fee)`);
        setTradeOpen(false); 
      } catch (e) {
        toast.error(e.message || "Trade failed");
      } finally {
        setSubmitting(false);
        setProcessing(false);
      }
    }, Math.random() * 3000 + 2000); // 2-5s delay
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
          <p className="mt-2 text-muted-foreground">Live prices from CoinGecko. Trade instantly from your EUR account with realistic execution.</p>
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

      {/* Order Book for Selected Coin */}
      {selectedCoin && orderBook && (
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Book - {selectedCoin.symbol}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Spread: {fmtNumber(orderBook.spread, 2)}% | Best Bid: {fmtMoney(Math.round(orderBook.bestBid * 100), 'EUR')} | Best Ask: {fmtMoney(Math.round(orderBook.bestAsk * 100), 'EUR')}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Asks (Sell)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Price (EUR)</TableHead>
                      <TableHead>Size ({selectedCoin.symbol})</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.asks.slice(0, 5).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-destructive">{fmtMoney(Math.round(entry.price * 100), 'EUR')}</TableCell>
                        <TableCell>{fmtNumber(entry.size, 4)}</TableCell>
                        <TableCell>{fmtNumber(entry.total, 4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Bids (Buy)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Price (EUR)</TableHead>
                      <TableHead>Size ({selectedCoin.symbol})</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderBook.bids.slice(0, 5).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-green-600">{fmtMoney(Math.round(entry.price * 100), 'EUR')}</TableCell>
                        <TableCell>{fmtNumber(entry.size, 4)}</TableCell>
                        <TableCell>{fmtNumber(entry.total, 4)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Trade {selectedCoin.symbol}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Simulated execution with slippage and fees.</p>
              <Button onClick={() => openTrade(selectedCoin, "buy")} className="w-full">Buy {selectedCoin.symbol}</Button>
              <Button onClick={() => openTrade(selectedCoin, "sell")} variant="outline" className="w-full">Sell {selectedCoin.symbol}</Button>
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

      {/* Trade Dialog with Order Types, Slippage, Limit */}
      <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
        <DialogContent className="max-w-md">
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
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market (instant)</SelectItem>
                    <SelectItem value="limit">Limit (set price)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {orderType === "limit" && (
                <div className="space-y-2">
                  <Label>Limit Price (EUR)</Label>
                  <Input 
                    type="number" 
                    value={limitPrice} 
                    onChange={e => setLimitPrice(e.target.value)} 
                    placeholder={selectedCoin.price_eur.toString()}
                  />
                </div>
              )}
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
                    Qty: {fmtCrypto(parseFloat(tradeAmountEur || "0") / getExecutedPrice())} {selectedCoin.symbol}
                  </p>
                  <p className="text-xs text-destructive">
                    Est. Slippage: {slippage * 100}% | Fee: {fee * 100}%
                  </p>
                  {tradeMode === "buy" && (
                    <p className="text-xs text-destructive">
                      Total (incl. fee): {fmtMoney(Math.round(parseFloat(tradeAmountEur) * (1 + fee) * 100), 'EUR')}
                    </p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button 
                  variant="hero" 
                  onClick={submitTrade} 
                  disabled={submitting || !tradeAmountEur || processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Executing Trade...
                    </>
                  ) : submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
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


