import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtIban } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { getUserRecipients, addRecipient, toggleRecipientFavorite, deleteRecipient, type MockRecipient } from "@/lib/mockStore";

const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "PLN", "VND", "JPY", "CAD", "AUD"] as const;
const COUNTRIES = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Ireland", "Belgium",
  "Portugal", "Poland", "Austria", "Sweden", "Denmark", "Vietnam", "Japan",
  "United States", "United Kingdom", "Canada", "Australia", "Switzerland",
  "Singapore", "South Korea", "Thailand", "Malaysia", "Philippines", "India",
];

const ibanRe = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const recipientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  iban: z.string().trim().toUpperCase().regex(ibanRe, "Invalid IBAN"),
  swift_bic: z.string().trim().toUpperCase().max(11).optional().or(z.literal("")),
  bank_name: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(40).optional().or(z.literal("")),
  currency: z.enum(CURRENCIES),
});

const Recipients = () => {
  const { user } = useAuth();
  const [list, setList] = useState<MockRecipient[]>([]);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("Germany");
  const [currency, setCurrency] = useState<string>("EUR");

  const load = () => {
    if (!user) return;
    setList(getUserRecipients(user.id));
  };

  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const parsed = recipientSchema.safeParse({ name, iban: iban.replace(/\s+/g, ""), swift_bic: swift.replace(/\s+/g, ""), bank_name: bank, country, currency });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    addRecipient({
      userId: user.id,
      name: parsed.data.name,
      iban: parsed.data.iban,
      swiftBic: parsed.data.swift_bic || undefined,
      bankName: parsed.data.bank_name || undefined,
      country: parsed.data.country || undefined,
      currency: parsed.data.currency,
      isFavorite: false,
    });
    toast.success("Recipient added");
    setName(""); setIban(""); setSwift(""); setBank(""); setCountry("Germany"); setCurrency("EUR");
    setOpen(false);
    load();
  };

  const toggleFav = (r: MockRecipient) => {
    toggleRecipientFavorite(r.id, user!.id);
    load();
  };
  const remove = (r: MockRecipient) => {
    deleteRecipient(r.id, user!.id);
    toast.success("Removed");
    load();
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-5xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Address book</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Recipients</h1>
          <p className="mt-2 text-muted-foreground">Save the people and businesses you pay regularly.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Plus className="h-4 w-4" />Add recipient</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display text-2xl">New recipient</DialogTitle></DialogHeader>
            <form onSubmit={add} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna Müller" /></div>
              <div className="space-y-2"><Label>IBAN</Label><Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="DE89 3704 ..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>SWIFT / BIC</Label><Input value={swift} onChange={(e) => setSwift(e.target.value.toUpperCase())} placeholder="DEUTDEFF" /></div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bank name</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Deutsche Bank" /></div>
              <DialogFooter>
                <Button type="submit" variant="hero">Save recipient</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-8 border-border/70">
        {list.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No recipients yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 sm:px-6 py-4">
                <button onClick={() => toggleFav(r)} className="text-muted-foreground hover:text-accent">
                  <Star className={`h-4 w-4 ${r.isFavorite ? "fill-accent text-accent" : ""}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.country || ""} {r.currency ? `· ${r.currency}` : ""}
                    {r.iban ? ` · ${fmtIban(r.iban)}` : ""}
                    {r.swiftBic ? ` · ${r.swiftBic}` : ""}
                    {r.bankName ? ` · ${r.bankName}` : ""}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">{r.currency}</span>
                <Button variant="ghost" size="sm" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Recipients;