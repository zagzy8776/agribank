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
import { Copy, Loader2, Send, Globe2, Banknote, ArrowRight, Users, Search, CheckCircle2 } from "lucide-react";
import { fmtMoney, fmtIban, fmtNumber } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { getUserAccounts, getUserRecipients, addRecipient, internalTransfer, internationalTransfer, getUserByEmail, isUserFrozen, getFxRates, type Account, type Recipient } from "@/lib/db";

// ---------- countries with flags & network ----------
type Country = {
  code: string;
  name: string;
  flag: string;
  currency: string;
  network: 'sepa' | 'sepa_instant' | 'swift' | 'local';
  iban: boolean;
  swift: boolean;
};

const ALL_COUNTRIES: Country[] = [
  // SEPA (EU/EEA)
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', currency: 'BGN', network: 'sepa', iban: true, swift: false },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', network: 'sepa', iban: true, swift: false },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', network: 'sepa_instant', iban: true, swift: false },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF', network: 'sepa', iban: true, swift: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', network: 'sepa_instant', iban: true, swift: false },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON', network: 'sepa', iban: true, swift: false },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', network: 'sepa_instant', iban: true, swift: false },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', network: 'sepa_instant', iban: true, swift: false },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', network: 'sepa', iban: true, swift: false },
  // SWIFT countries
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', network: 'swift', iban: true, swift: true },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', network: 'swift', iban: true, swift: true },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', network: 'swift', iban: false, swift: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', network: 'swift', iban: true, swift: true },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', network: 'swift', iban: true, swift: true },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', network: 'swift', iban: true, swift: true },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', network: 'swift', iban: true, swift: true },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', network: 'swift', iban: false, swift: true },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', network: 'swift', iban: true, swift: true },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', network: 'swift', iban: false, swift: true },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', network: 'swift', iban: false, swift: true },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', network: 'swift', iban: true, swift: true },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', network: 'swift', iban: false, swift: true },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', network: 'swift', iban: false, swift: true },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', network: 'swift', iban: true, swift: true },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', network: 'swift', iban: false, swift: true },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', network: 'swift', iban: true, swift: true },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', network: 'swift', iban: true, swift: true },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', network: 'swift', iban: true, swift: true },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', network: 'swift', iban: false, swift: true },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', network: 'swift', iban: false, swift: true },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', network: 'swift', iban: true, swift: true },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', network: 'swift', iban: true, swift: true },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', network: 'swift', iban: true, swift: true },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY', network: 'swift', iban: true, swift: true },
];

const REGIONS = [
  { label: 'Europe (SEPA)', countries: ALL_COUNTRIES.filter(c => c.network === 'sepa' || c.network === 'sepa_instant') },
  { label: 'Europe (non-SEPA)', countries: ALL_COUNTRIES.filter(c => ['GB', 'CH', 'NO'].includes(c.code)) },
  { label: 'Asia', countries: ALL_COUNTRIES.filter(c => ['JP', 'KR', 'SG', 'HK', 'CN', 'IN', 'VN', 'TH', 'MY', 'PH', 'TR'].includes(c.code)) },
  { label: 'Americas', countries: ALL_COUNTRIES.filter(c => ['US', 'CA', 'BR', 'MX', 'AR'].includes(c.code)) },
  { label: 'Middle East & Africa', countries: ALL_COUNTRIES.filter(c => ['AE', 'SA', 'ZA', 'NG', 'KE'].includes(c.code)) },
  { label: 'Oceania', countries: ALL_COUNTRIES.filter(c => ['AU', 'NZ'].includes(c.code)) },
];

// Mock FX rates
const MOCK_RATES: Record<string, number> = {
  EUR: 1, USD: 1.09, GBP: 0.86, CHF: 0.97, PLN: 4.32, SEK: 11.45, NOK: 11.72, DKK: 7.46,
  CZK: 24.85, HUF: 388, RON: 4.97, BGN: 1.96,
  VND: 26850, JPY: 162.5, KRW: 1468, SGD: 1.46, HKD: 8.52, CNY: 7.89, INR: 90.8,
  THB: 38.5, MYR: 5.12, PHP: 61.3, IDR: 17800,
  CAD: 1.48, AUD: 1.65, NZD: 1.81, BRL: 5.92, MXN: 19.8, ARS: 1280, TRY: 36.2,
  AED: 4.0, SAR: 4.09, ZAR: 20.5, NGN: 1680, KES: 143,
};

const Transfers = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "receive" ? "receive" : "send";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [transferType, setTransferType] = useState<'internal' | 'international'>('international');
  const [rates, setRates] = useState<Record<string, number>>(MOCK_RATES);

  // Internal transfer
  const [internalEmail, setInternalEmail] = useState("");
  const [internalAmount, setInternalAmount] = useState("");
  const [internalDesc, setInternalDesc] = useState("");
  const [recipientExists, setRecipientExists] = useState(false);
  const [recipientName, setRecipientName] = useState("");

  // International
  const [fromAccountId, setFromAccountId] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [recipientIban, setRecipientIban] = useState("");
  const [recipientSwift, setRecipientSwift] = useState("");
  const [recipientBankName, setRecipientBankName] = useState("");
  const [intlAmount, setIntlAmount] = useState("");
  const [intlDesc, setIntlDesc] = useState("");
  const [saveRecipient, setSaveRecipient] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;
    const loadData = async () => {
      try {
        const accts = await getUserAccounts(user.userId);
        if (Array.isArray(accts)) {
          setAccounts(accts);
          if (accts.length > 0) setFromAccountId(accts[0].id);
        }
        const recips = await getUserRecipients(user.userId);
        if (Array.isArray(recips)) {
          setRecipients(recips);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };
    loadData();

    // Fetch live rates
    getFxRates().then(newRates => {
      if (newRates) setRates(newRates);
    });
  }, [user]);

  const fromAccount = Array.isArray(accounts) ? accounts.find(a => a.id === fromAccountId) : null;
  const toCurrency = selectedCountry?.currency || 'EUR';
  const network = selectedCountry?.network || 'sepa_instant';

  const conversion = useMemo(() => {
    const amt = parseFloat(intlAmount || "0");
    if (!fromAccount || !amt || !rates[fromAccount.currency] || !rates[toCurrency]) {
      return { rate: 1, converted: amt, fee: 0, total: amt };
    }
    const eurAmount = amt / rates[fromAccount.currency];
    const converted = eurAmount * rates[toCurrency];
    const rate = rates[toCurrency] / rates[fromAccount.currency];
    let feePct = 0;
    if (network === 'sepa') feePct = 0.001;
    if (network === 'sepa_instant') feePct = 0.001;
    if (network === 'swift') feePct = 0.005;
    const fee = amt * feePct + (network === 'swift' ? 4 : 0);
    return { rate, converted, fee, total: amt + fee };
  }, [intlAmount, fromAccount, toCurrency, network]);

  // Check internal recipient email
  useEffect(() => {
    if (!internalEmail.trim()) { setRecipientExists(false); setRecipientName(""); return; }
    const lookup = async () => {
      const found = await getUserByEmail(internalEmail.trim());
      if (found && found.id !== user?.userId) {
        setRecipientExists(true);
        setRecipientName(found.full_name);
      } else {
        setRecipientExists(false);
        setRecipientName("");
      }
    };
    lookup();
  }, [internalEmail, user]);

  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    if (user) isUserFrozen(user.userId).then(setFrozen);
  }, [user]);

  const handleReviewInternal = () => {
    if (frozen) { toast.error('Account is frozen. Contact support@agribank.com'); return; }
    const amt = parseFloat(internalAmount || "0");
    if (!amt || amt <= 0) { toast.error("Enter an amount"); return; }
    if (!recipientExists) { toast.error("No AgriBank user found with that email"); return; }
    
    const cents = Math.round(amt * 100);
    const accounting = Array.isArray(accounts) ? accounts.find(a => a.currency === 'EUR' && a.is_primary) : null;
    if (!accounting || cents > accounting.balance_cents) {
      toast.error("Insufficient balance in EUR account");
      return;
    }

    setTransferType('internal');
    setShowConfirm(true);
  };

  const handleReviewInternational = () => {
    if (frozen) { toast.error('Account is frozen. Contact support@agribank.com'); return; }
    if (!fromAccount) { toast.error("No account selected"); return; }
    if (!selectedCountry) { toast.error("Select a destination country"); return; }
    if (!recipientName) { toast.error("Enter recipient name"); return; }
    if (selectedCountry.iban && !recipientIban) { toast.error("Enter IBAN"); return; }
    
    const amt = parseFloat(intlAmount || "0");
    if (!amt || amt <= 0) { toast.error("Enter an amount"); return; }
    const totalCents = Math.round(conversion.total * 100);
    if (totalCents > fromAccount.balance_cents) { toast.error("Insufficient balance"); return; }

    setTransferType('international');
    setShowConfirm(true);
  };

  const executeTransfer = async () => {
    if (!user?.userId) return;
    setSubmitting(true);
    try {
      if (transferType === 'internal') {
        const accounting = Array.isArray(accounts) ? accounts.find(a => a.currency === 'EUR' && a.is_primary) : null;
        if (!accounting) throw new Error("Primary EUR account not found");
        
        await internalTransfer({
          userId: user.userId,
          fromAccountId: accounting.id,
          toEmail: internalEmail,
          amountCents: Math.round(parseFloat(internalAmount) * 100),
          description: internalDesc
        });
        toast.success(`✅ Sent €${parseFloat(internalAmount).toFixed(2)} to ${recipientName || internalEmail}`);
        setInternalEmail(""); setInternalAmount(""); setInternalDesc("");
      } else {
        if (!fromAccount) throw new Error("Source account not selected");
        if (!selectedCountry) throw new Error("Destination country not selected");

        const amtCents = Math.round(parseFloat(intlAmount) * 100);
        await internationalTransfer({
          userId: user.userId,
          fromAccountId: fromAccountId,
          amountCents: amtCents,
          totalCents: Math.round(conversion.total * 100),
          currency: fromAccount.currency,
          description: intlDesc || `Transfer to ${recipientName} (${selectedCountry.name})`,
          recipientName,
          recipientIban: recipientIban,
          network: selectedCountry.network
        });
        
        if (saveRecipient) {
          await addRecipient({
            userId: user.userId, name: recipientName,
            iban: recipientIban || "", swiftBic: recipientSwift || "",
            bankName: recipientBankName || "", country: selectedCountry.name,
            currency: selectedCountry.currency
          });
        }
        toast.success(`✅ Sent ${fmtMoney(amtCents, fromAccount.currency)} to ${recipientName}`);
        setIntlAmount(""); setIntlDesc(""); setRecipientName(""); setRecipientIban(""); setRecipientSwift(""); setRecipientBankName("");
      }
      
      const updatedAccts = await getUserAccounts(user.userId);
      if (Array.isArray(updatedAccts)) setAccounts(updatedAccts);
      const updatedRecips = await getUserRecipients(user.userId);
      if (Array.isArray(updatedRecips)) setRecipients(updatedRecips);
      setShowConfirm(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Transfer failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectRecipient = (r: Recipient) => {
    setRecipientName(r.name);
    setRecipientIban(r.iban || "");
    setRecipientSwift(r.swift_bic || "");
    setRecipientBankName(r.bank_name || "");
    const c = ALL_COUNTRIES.find(c => c.name === r.country);
    if (c) setSelectedCountry(c);
    setShowConfirm(true);
  };

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : ALL_COUNTRIES;

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Money movement</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Send & receive</h1>
      <p className="mt-2 text-muted-foreground">Internal transfers, SEPA across Europe, SWIFT worldwide. Live FX, transparent fees.</p>

      <Tabs defaultValue={initialTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="send"><Send className="h-4 w-4" />Send</TabsTrigger>
          <TabsTrigger value="receive"><Banknote className="h-4 w-4" />Receive</TabsTrigger>
        </TabsList>

        {/* SEND — two sub-tabs */}
        <TabsContent value="send" className="mt-6">
          <Tabs defaultValue="international">
            <TabsList>
              <TabsTrigger value="internal"><Users className="h-3.5 w-3.5" />AgriBank user</TabsTrigger>
              <TabsTrigger value="international"><Globe2 className="h-3.5 w-3.5" />International</TabsTrigger>
            </TabsList>

            {/* Internal transfer */}
            <TabsContent value="internal" className="mt-4">
              <Card className="p-6 border-border/70 max-w-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Send money instantly and free to another AgriBank user.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Recipient email</Label>
                    <Input value={internalEmail} onChange={e => setInternalEmail(e.target.value)} placeholder="friend@example.com" type="email" />
                    {internalEmail && (
                      <p className={`text-xs ${recipientExists ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {recipientExists ? `✓ ${recipientName || 'AgriBank user found'}` : 'No AgriBank user found'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (EUR)</Label>
                    <Input value={internalAmount} onChange={e => setInternalAmount(e.target.value)} placeholder="50.00" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference (optional)</Label>
                    <Input value={internalDesc} onChange={e => setInternalDesc(e.target.value)} placeholder="Dinner split" maxLength={80} />
                  </div>
                  <Button className="w-full" variant="hero" onClick={handleReviewInternal} disabled={submitting || !recipientExists}>
                    Review & continue <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Free · Instant · No limits</p>
                </div>
              </Card>
            </TabsContent>

            {/* International transfer */}
            <TabsContent value="international" className="mt-4">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 border-border/70">
                  <div className="space-y-5">
                    {/* From account */}
                    <div className="space-y-2">
                      <Label>From account</Label>
                      <Select value={fromAccountId} onValueChange={setFromAccountId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {fmtMoney(a.balance_cents, a.currency)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country selector */}
                    <div className="space-y-2">
                      <Label>Destination</Label>
                      <Select value={selectedCountry?.code || ''} onValueChange={(v) => {
                        const c = ALL_COUNTRIES.find(c => c.code === v);
                        setSelectedCountry(c || null);
                        if (c) { setRecipientIban(""); setRecipientSwift(""); }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Search country..." /></SelectTrigger>
                        <SelectContent className="max-h-80">
                          <div className="px-2 py-2 sticky top-0 bg-popover z-10">
                            <Input placeholder="Type to search..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="h-8" />
                          </div>
                          {countrySearch ? (
                            filteredCountries.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} · {c.currency}</SelectItem>)
                          ) : (
                            REGIONS.map(region => (
                              <div key={region.label}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{region.label}</div>
                                {region.countries.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} · {c.currency}</SelectItem>)}
                              </div>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCountry && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe2 className="h-3 w-3" />
                          {selectedCountry.network === 'sepa_instant' ? 'SEPA Instant · ~10 seconds · 0.1% fee' :
                           selectedCountry.network === 'sepa' ? 'SEPA · 1 business day · 0.1% fee' :
                           'SWIFT · 1-3 business days · 0.5% + €4 fee'}
                        </p>
                      )}
                    </div>

                    {/* Recipient name */}
                    <div className="space-y-2">
                      <Label>Recipient name</Label>
                      <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Anna Müller" />
                    </div>

                    {/* Conditional fields */}
                    {selectedCountry?.iban && (
                      <div className="space-y-2">
                        <Label>IBAN</Label>
                        <Input value={recipientIban} onChange={e => setRecipientIban(e.target.value.toUpperCase())} placeholder="DE89 3704 0044 0532 0130 00" />
                      </div>
                    )}
                    {selectedCountry?.swift && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>SWIFT / BIC</Label>
                          <Input value={recipientSwift} onChange={e => setRecipientSwift(e.target.value.toUpperCase())} placeholder="DEUTDEFF" />
                        </div>
                        <div className="space-y-2">
                          <Label>Bank name</Label>
                          <Input value={recipientBankName} onChange={e => setRecipientBankName(e.target.value)} placeholder="Vietcombank" />
                        </div>
                      </div>
                    )}
                    {selectedCountry && !selectedCountry.iban && !selectedCountry.swift && (
                      <div className="space-y-2">
                        <Label>Account details</Label>
                        <Input value={recipientIban} onChange={e => setRecipientIban(e.target.value)} placeholder="Account number or routing info" />
                      </div>
                    )}

                    {/* Amount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Amount ({fromAccount?.currency || 'EUR'})</Label>
                        <Input value={intlAmount} onChange={e => setIntlAmount(e.target.value)} placeholder="100.00" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Reference</Label>
                        <Input value={intlDesc} onChange={e => setIntlDesc(e.target.value)} placeholder="Invoice #001" maxLength={80} />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={saveRecipient} onChange={e => setSaveRecipient(e.target.checked)} />
                      Save to recipient book
                    </label>

                    <Button className="w-full" variant="hero" onClick={handleReviewInternational} disabled={submitting || !selectedCountry}>
                      Review & continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {/* Side panel */}
                <div className="space-y-4">
                  {/* Conversion */}
                  <Card className="p-5 bg-gradient-cream border-border/70">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                      <Globe2 className="h-3.5 w-3.5" /> Live exchange
                    </p>
                    {intlAmount && selectedCountry ? (
                      <>
                        <p className="mt-3 font-display text-3xl text-primary">
                          {fmtNumber(conversion.converted, 2)} <span className="text-base text-muted-foreground">{toCurrency}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          1 {fromAccount?.currency || 'EUR'} = {fmtNumber(conversion.rate, 4)} {toCurrency}
                        </p>
                        <div className="mt-5 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{fmtMoney(Math.round(parseFloat(intlAmount || "0") * 100), fromAccount?.currency)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{fmtMoney(Math.round(conversion.fee * 100), fromAccount?.currency)}</span></div>
                          <div className="flex justify-between font-medium pt-2 border-t"><span>You pay</span><span>{fmtMoney(Math.round(conversion.total * 100), fromAccount?.currency)}</span></div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">Select a country and enter an amount.</p>
                    )}
                  </Card>

                  {/* Saved recipients */}
                  <Card className="p-5 border-border/70">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saved recipients</p>
                    {recipients.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">No recipients yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
                        {recipients.slice(0, 6).map(r => (
                          <li key={r.id}>
                            <button onClick={() => selectRecipient(r)} className="w-full text-left p-3 rounded-lg hover:bg-secondary transition-colors">
                              <p className="text-sm font-medium">{r.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.country} · {r.currency} {r.iban ? `· ${fmtIban(r.iban)}` : ''}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* RECEIVE */}
        <TabsContent value="receive" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {accounts.map(a => (
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
            Share your IBAN to receive SEPA/SWIFT transfers. Funds arrive 10s (SEPA Instant) to 3 days (SWIFT).
          </p>
        </TabsContent>
      </Tabs>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Confirm transfer</DialogTitle>
          </DialogHeader>
          
          {transferType === 'internal' ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>Internal (Instant & Free)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recipient</span><span>{recipientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{internalEmail}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>Amount</span><span className="text-primary">{fmtMoney(Math.round(parseFloat(internalAmount || "0") * 100), 'EUR')}</span></div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">From</span><span>{fromAccount?.name} ({fromAccount?.currency})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To</span><span>{recipientName} · {selectedCountry?.flag} {selectedCountry?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span>{network === 'sepa_instant' ? 'SEPA Instant' : network.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmtMoney(Math.round(parseFloat(intlAmount || "0") * 100), fromAccount?.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>{fmtMoney(Math.round(conversion.fee * 100), fromAccount?.currency)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>{fmtMoney(Math.round(conversion.total * 100), fromAccount?.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Recipient gets</span><span className="text-green-600 font-medium">{fmtNumber(conversion.converted, 2)} {toCurrency}</span></div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</Button>
            <Button variant="hero" onClick={executeTransfer} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transfers;
