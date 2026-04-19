import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, Send, Globe2, Banknote, ArrowRight } from "lucide-react";
import { fmtMoney, fmtIban, fmtNumber } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";

const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "PLN"] as const;
type Currency = typeof CURRENCIES[number];

const ibanRe = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const swiftRe = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const transferSchema = z.object({
  fromAccountId: z.string().uuid("Choose a source account"),
  network: z.enum(["sepa", "sepa_instant", "swift"]),
  recipientName: z.string().trim().min(2).max(80),
  iban: z.string().trim().toUpperCase().regex(ibanRe, "Invalid IBAN"),
  swift: z.string().trim().toUpperCase().regex(swiftRe).optional().or(z.literal("")),
  amount: z.number().positive("Enter an amount").max(1_000_000),
  toCurrency: z.enum(CURRENCIES),
  description: z.string().trim().max(140).optional().or(z.literal("")),
  saveRecipient: z.boolean().optional(),
});

const Transfers = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "receive" ? "receive" : "send";

  const [accounts, setAccounts] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [loadingRates, setLoadingRates] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fromAccountId, setFromAccountId] = useState("");
  const [network, setNetwork] = useState<"sepa" | "sepa_instant" | "swift">("sepa_instant");
  const [recipientName, setRecipientName] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [amount, setAmount] = useState("");
  const [toCurrency, setToCurrency] = useState<Currency>("EUR");
  const [description, setDescription] = useState("");
  const [saveRecipient, setSaveRecipient] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: a }, { data: r }] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id).order("is_primary", { ascending: false }),
        supabase.from("recipients").select("*").eq("user_id", user.id).order("is_favorite", { ascending: false }),
      ]);
      setAccounts(a || []);
      setRecipients(r || []);
      if (a && a[0]) setFromAccountId(a[0].id);
    })();
    // FX
    supabase.functions
      .invoke("fx-rates")
      .then(({ data }) => {
        if (data?.rates) setRates(data.rates);
      })
      .finally(() => setLoadingRates(false));
  }, [user]);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  const conversion = useMemo(() => {
    const amt = parseFloat(amount || "0");
    if (!fromAccount || !amt || !rates[fromAccount.currency] || !rates[toCurrency]) {
      return { rate: 1, converted: amt, fee: 0, total: amt };
    }
    // base EUR — rates[ccy] = ccy per 1 EUR
    const eurAmount = amt / rates[fromAccount.currency];
    const converted = eurAmount * rates[toCurrency];
    const rate = rates[toCurrency] / rates[fromAccount.currency];
    let feePct = 0;
    if (network === "sepa") feePct = 0;
    if (network === "sepa_instant") feePct = 0.001;
    if (network === "swift") feePct = 0.005;
    const fee = amt * feePct + (network === "swift" ? 4 : 0); // €4 fixed for SWIFT
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
    if (totalCents > fromAccount.balance_cents) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Debit source
      const newBal = fromAccount.balance_cents - totalCents;
      const { error: balErr } = await supabase
        .from("accounts")
        .update({ balance_cents: newBal })
        .eq("id", fromAccount.id);
      if (balErr) throw balErr;

      // 2. Insert transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user!.id,
        account_id: fromAccount.id,
        direction: "debit",
        amount_cents: Math.round(parseFloat(amount) * 100),
        currency: fromAccount.currency,
        description: description || `Transfer to ${recipientName}`,
        category: "Transfer",
        counterparty_name: recipientName,
        counterparty_iban: parsed.data.iban,
        counterparty_swift: parsed.data.swift || null,
        network,
        fx_rate: conversion.rate,
        fee_cents: Math.round(conversion.fee * 100),
        status: "completed",
      });
      if (txErr) throw txErr;

      // 3. Save recipient
      if (saveRecipient) {
        await supabase.from("recipients").upsert(
          {
            user_id: user!.id,
            name: recipientName,
            iban: parsed.data.iban,
            swift_bic: parsed.data.swift || null,
            currency: toCurrency,
          },
          { onConflict: "user_id,iban" as any, ignoreDuplicates: true } as any,
        );
      }

      toast.success(`Sent ${fmtMoney(Math.round(parseFloat(amount) * 100), fromAccount.currency)} to ${recipientName}`);
      // Refresh
      const { data: a } = await supabase.from("accounts").select("*").eq("user_id", user!.id).order("is_primary", { ascending: false });
      setAccounts(a || []);
      setAmount(""); setDescription(""); setRecipientName(""); setIban(""); setSwift("");
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

  const useRecipient = (r: any) => {
    setRecipientName(r.name);
    setIban(r.iban || "");
    setSwift(r.swift_bic || "");
    setToCurrency(r.currency || "EUR");
    if (r.swift_bic) setNetwork("swift");
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
              <form onSubmit={handleSend} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From account</Label>
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} · {fmtMoney(a.balance_cents, a.currency)}
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

                <Button type="submit" variant="hero" size="lg" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send {amount ? fmtMoney(Math.round(parseFloat(amount || "0") * 100), fromAccount?.currency) : "money"} <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </Card>

            {/* Conversion summary */}
            <div className="space-y-4">
              <Card className="p-5 bg-gradient-cream border-border/70">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5" /> Live exchange
                </p>
                {loadingRates ? (
                  <div className="mt-4 text-sm text-muted-foreground">Loading rates…</div>
                ) : (
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
                )}
              </Card>

              <Card className="p-5 border-border/70">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saved recipients</p>
                {recipients.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No recipients yet. They'll appear here.</p>
                ) : (
                  <ul className="mt-3 space-y-2 max-h-72 overflow-auto">
                    {recipients.slice(0, 6).map((r) => (
                      <li key={r.id}>
                        <button onClick={() => useRecipient(r)} className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{fmtIban(r.iban)}</p>
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
    </div>
  );
};

export default Transfers;
