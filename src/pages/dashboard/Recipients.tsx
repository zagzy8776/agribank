import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtIban } from "@/lib/format";
import { z } from "zod";

const ibanRe = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const recipientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  iban: z.string().trim().toUpperCase().regex(ibanRe, "Invalid IBAN"),
  swift_bic: z.string().trim().toUpperCase().max(11).optional().or(z.literal("")),
  bank_name: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(40).optional().or(z.literal("")),
});

const Recipients = () => {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("recipients").select("*").eq("user_id", user.id).order("is_favorite", { ascending: false }).order("created_at", { ascending: false });
    setList(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = recipientSchema.safeParse({ name, iban: iban.replace(/\s+/g, ""), swift_bic: swift.replace(/\s+/g, ""), bank_name: bank, country });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const { error } = await supabase.from("recipients").insert({
      user_id: user!.id,
      name: parsed.data.name,
      iban: parsed.data.iban,
      swift_bic: parsed.data.swift_bic || null,
      bank_name: parsed.data.bank_name || null,
      country: parsed.data.country || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Recipient added");
    setName(""); setIban(""); setSwift(""); setBank(""); setCountry("");
    setOpen(false);
    load();
  };

  const toggleFav = async (r: any) => {
    await supabase.from("recipients").update({ is_favorite: !r.is_favorite }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("recipients").delete().eq("id", id);
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
                <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Germany" /></div>
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
                  <Star className={`h-4 w-4 ${r.is_favorite ? "fill-accent text-accent" : ""}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{fmtIban(r.iban)}{r.swift_bic ? ` · ${r.swift_bic}` : ""}{r.bank_name ? ` · ${r.bank_name}` : ""}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">{r.currency}</span>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Recipients;
