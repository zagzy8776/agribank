import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Loader2, Send, Globe2, Banknote, ArrowRight } from "lucide-react";
import { fmtMoney, fmtIban, fmtNumber } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { getUserAccounts, getUserRecipients, addRecipient, addTransaction, updateBalance, type MockAccount, type MockRecipient } from "@/lib/mockStore";

const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "PLN", "VND", "JPY", "CAD", "AUD"] as const;
type Currency = typeof CURRENCIES[number];

const COUNTRIES = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Ireland", "Belgium",
  "Portugal", "Poland", "Austria", "Sweden", "Denmark", "Vietnam", "Japan",
  "United States", "United Kingdom", "Canada", "Australia", "Switzerland",
  "Singapore", "South Korea", "Thailand", "Malaysia", "Philippines", "India",
];

const ibanRe = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const swiftRe = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Choose a source account"),
  network: z.enum(["sepa", "sepa_instant", "swift"]),
  recipientName: z.string().trim().min(2).max(80),
  iban: z.string().trim().toUpperCase().regex(ibanRe, "Invalid IBAN"),
  swift: z.string().trim().toUpperCase().regex(swiftRe).optional().or(z.literal("")),
  amount: z.number().positive("Enter an amount").max(1_000_000),
  toCurrency: z.enum(CURRENCIES),
  description: z.string().trim().max(140).optional().or(z.literal("")),
  saveRecipient: z.boolean().optional(),
});

// Mock FX rates
const MOCK_RATES: Record<string, number> = {
  EUR: 1, GBP: 0.86, USD: 1.09, CHF: 0.97, PLN: 4.32,
  VND: 26850, JPY: 162.5, CAD: 1.48, AUD: 1.65,
};

const Transfers = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "receive" ? "receive" : "send";

  const [accounts, setAccounts] = useState<MockAccount[]>([]);
  const [recipients, setRecipients] = useState<MockRecipient[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(MOCK_RATES);
  const [loadingRates, setLoadingRates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const [fromAccountId, setFromAccountId] = useState("");
  const [network, setNetwork] = useState<"sepa" | "sepa_instant" | "swift">("sepa_instant");
  const [recipientName, setRecipientName] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [amount, setAmount] = useState("");
  const [toCurrency, setToCurrency] = useState<Currency>("EUR");
  const [description, setDescription] = useState("");
  const [saveRecipient, setSaveRecipient] = useState(true);
  const [recipientCountry, setRecipientCountry] = useState("Germany");
  const [recipientBank, setRecipientBank] = useState("");

  useEffect(() => {
    if (!user) return;
    const userAccounts = getUserAccounts(user.id);
    setAccounts(userAccounts);
    if (userAccounts.length > 0) setFromAccountId(userAccounts[0].id);
    setRecipients(getUserRecipients(user.id));
    setLoadingRates(false);
  }, [user]);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  const conversion = useMemo(() => {
    const amt = parseFloat(amount || "0");
    if (!fromAccount || !amt || !rates[fromAccount.currency] || !rates[toCurrency]) {
      return { rate: 1, converted: amt, fee: 0, total: amt };
    }
    const eurAmount = amt / rates[fromAccount.currency];
    const converted = eurAmount * rates[toCurrency];
    const rate = rates[toCurrency] / rates[fromAccount.currency];
    let feePct = 0;
    if (network === "sepa") feePct = 0;
    if (network === "sepa_instant") feePct = 0.001;
    if (network === "swift") feePct = 0.005;
    const fee = amt * feePct + (network === "swift" ? 4 : 0);
    return { rate, converted, fee, total: amt + fee };
  }, [amount, fromAccount, toCurrency, rates, network]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = transferSchema.safeParse({
      fromAccountId,
      network,
      recipientName,
      iban: iban.replace(/\s+/g, ""),
      swift: swift.replace(/\s+/g, ""),
      amount: parseFloat(amount || "0"),
      toCurrency,
      description,
      saveRecipient,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (network === "swift" && !parsed.data.swift) {
      toast.error("SWIFT/BIC is required for international transfers");
      return;
    }
    if (!fromAccount) return;
    const totalCents = Math.round(conversion.total * 100);
    if (totalCents > fromAccount.balanceCents) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Debit source
      const newBal = fromAccount.balanceCents - totalCents;
      updateBalance(fromAccount.id, newBal);

      // 2. Insert transaction
      addTransaction({
        userId: user!.id,
        accountId: fromAccount.id,
        direction: "debit",
        amountCents: Math.round(parseFloat(amount) * 100),
        currency: fromAccount.currency,
        description: description || `Transfer to ${recipientName}`,
        category: "Transfer",
        counterpartyName: recipientName,
        counterpartyIban: parsed.data.iban,
        network,
        status: "completed",
      });

      // 3. Save recipient
      if (saveRecipient) {
        addRecipient({
          userId: user!.id,
          name: recipientName,
          iban: parsed.data.iban,
          swiftBic: parsed.data.swift || undefined,
          bankName: recipientBank || undefined,
          country: recipientCountry,
          currency: toCurrency,
          isFavorite: false,
        });
      }

      toast.success(`Sent ${fmtMoney(Math.round(parseFloat(amount) * 100), fromAccount.currency)} to ${recipientName}`);
      // Refresh
      setAccounts(getUserAccounts(user!.id));
      setRecipients(getUserRecipients(user!.id));
      setAmount(""); setDescription(""); setRecipientName(""); setIban(""); setSwift("");
      setShowSendDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  };

  const selectRecipient = (r: MockRecipient) => {
    setRecipientName(r.name);
    setIban(r.iban || "");
    setSwift(r.swiftBic || "");
    setToCurrency(r.currency as Currency);
    setRecipientCountry(r.country || "Germany");
    setRecipientBank(r.bankName || "");
    if (r.swiftBic) setNetwork("swift");
    setShowSendDialog(true);
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Money movement</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Send & receive</h1>
      <p className="mt-2 text-muted-foreground">SEPA across Europe. SWIFT worldwide. Live FX, transparent fees.</p>

      <Tabs defaultValue={initialTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="send"><Send className="h-4 w-4" />Send</TabsTrigger>
          <TabsTrigger value="receive"><Banknote className="h-4 w-4" />Receive</TabsTrigger>
        </TabsList>

        {/* SEND */}
        <TabsContent value="send" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border-border/70">
              <form onSubmit={(e) => { e.preventDefault(); setShowSendDialog(true); }} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From account</Label>
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} · {fmtMoney(a.balanceCents, a.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select value={network} onValueChange={(v: any) => setNetwork(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sepa">SEPA · Free · 1 day</SelectItem>
                        <SelectItem value="sepa_instant">SEPA Instant · 0.1% · 10s</SelectItem>
                        <SelectItem value="swift">SWIFT International · 0.5% + €4 · 1–3 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rname">Recipient name</Label>
                  <Input id="rname" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Anna Müller" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="DE89 3704 0044 0532 0130 00" />
                  </div>
                  {network === "swift" && (
                    <div className="space-y-2">
                      <Label htmlFor="swift">SWIFT / BIC</Label>
                      <Input id="swift" value={swift} onChange={(e) => setSwift(e.target.value.toUpperCase())} placeholder="DEUTDEFF" />
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recipient country</Label>
                    <Select value={recipientCountry} onValueChange={setRecipientCountry}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient bank</Label>
                    <Input value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)} placeholder="Vietcombank" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amt">Amount ({fromAccount?.currency || "EUR"})</Label>
                    <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient currency</Label>
                    <Select value={toCurrency} onValueChange={(v: any) => setToCurrency(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Reference (optional)</Label>
                  <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} placeholder="Invoice #2024-091" />
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={saveRecipient} onChange={(e) => setSaveRecipient(e.target.checked)} className="rounded" />
                  Save to recipient book
                </label>

                <Button type="submit" variant="hero" size="lg" className="w-full">
                  Review & continue <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </Card>

            {/* Conversion summary */}
            <div className="space-y-4">
              <Card className="p-5 bg-gradient-cream border-border/70">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5" /> Live exchange
                </p>
                {amount ? (
                  <>
                    <p className="mt-3 font-display text-3xl text-primary">
                      {fmtNumber(conversion.converted, 2)} <span className="text-base text-muted-foreground">{toCurrency}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      1 {fromAccount?.currency || "EUR"} = {fmtNumber(conversion.rate, 4)} {toCurrency}
                    </p>
                    <div className="mt-5 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{fmtMoney(Math.round(parseFloat(amount || "0") * 100), fromAccount?.currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{fmtMoney(Math.round(conversion.fee * 100), fromAccount?.currency)}</span></div>
                      <div className="flex justify-between font-medium pt-2 border-t border-border"><span>You pay</span><span>{fmtMoney(Math.round(conversion.total * 100), fromAccount?.currency)}</span></div>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Enter an amount to see conversion.</p>
                )}
              </Card>

              <Card className="p-5 border-border/70">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saved recipients</p>
                {recipients.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No recipients yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 max-h-72 overflow-auto">
                    {recipients.slice(0, 6).map((r) => (
                      <li key={r.id}>
                        <button onClick={() => selectRecipient(r)} className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.country || ""} {r.currency ? `· ${r.currency}` : ""} {r.iban ? `· ${fmtIban(r.iban)}` : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* RECEIVE */}
        <TabsContent value="receive" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {accounts.map((a) => (
              <Card key={a.id} className="p-6 border-border/70">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{a.name}</p>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary">{a.currency}</span>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono">{fmtIban(a.iban)}</code>
                      <Button variant="ghost" size="sm" onClick={() => copy(a.iban || "")}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SWIFT / BIC</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono">AGRBDEFF</code>
                      <Button variant="ghost" size="sm" onClick={() => copy("AGRBDEFF")}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="text-sm">AgriBank SE · Frankfurt am Main</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Share these details to receive SEPA or SWIFT transfers. Funds typically arrive within 10 seconds (SEPA Instant) to 3 working days (SWIFT).
          </p>
        </TabsContent>
      </Tabs>

      {/* Send confirmation dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Confirm transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">From</span><span>{fromAccount?.name} ({fromAccount?.currency})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">To</span><span>{recipientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span>{network === "sepa_instant" ? "SEPA Instant" : network.toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmtMoney(Math.round(parseFloat(amount || "0") * 100), fromAccount?.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{fmtMoney(Math.round(conversion.fee * 100), fromAccount?.currency)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>{fmtMoney(Math.round(conversion.total * 100), fromAccount?.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recipient gets</span><span className="text-green-600 font-medium">{fmtNumber(conversion.converted, 2)} {toCurrency}</span></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleSend} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transfers;