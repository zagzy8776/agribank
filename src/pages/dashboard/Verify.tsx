import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Camera, FileText, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getAllKyc, submitKyc } from "@/lib/mockStore";

const STEPS = [
  { id: 1, label: "ID document", icon: FileText },
  { id: 2, label: "Selfie", icon: Camera },
  { id: 3, label: "Address", icon: MapPin },
  { id: 4, label: "Review", icon: ShieldCheck },
];

const COUNTRIES = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Ireland", "Belgium",
  "Portugal", "Poland", "Austria", "Sweden", "Denmark", "Vietnam", "Japan",
  "United States", "United Kingdom", "Canada", "Australia", "Switzerland",
];

const schema = z.object({
  document_type: z.string().min(2),
  document_number: z.string().trim().min(4).max(40),
  document_country: z.string().min(2),
  address_line: z.string().trim().min(4).max(120),
  city: z.string().trim().min(2).max(60),
  postal_code: z.string().trim().min(2).max(12),
  country: z.string().min(2),
});

const Verify = () => {
  const { user } = useAuth();
  const [profileStatus, setProfileStatus] = useState<string>("not_started");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [docType, setDocType] = useState("Passport");
  const [docNumber, setDocNumber] = useState("");
  const [docCountry, setDocCountry] = useState("Germany");
  const [selfieDone, setSelfieDone] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("Germany");

  useEffect(() => {
    if (!user) return;
    const allKyc = getAllKyc();
    const userKyc = allKyc.find(k => k.userId === user.id);
    if (userKyc) setProfileStatus(userKyc.status);
  }, [user]);

  const submit = () => {
    const parsed = schema.safeParse({
      document_type: docType, document_number: docNumber, document_country: docCountry,
      address_line: addressLine, city, postal_code: postal, country,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!selfieDone) { toast.error("Please complete the selfie step"); return; }

    setSubmitting(true);
    setTimeout(() => {
      submitKyc({
        userId: user!.id,
        documentType: parsed.data.document_type,
        documentCountry: parsed.data.document_country,
        city: parsed.data.city,
        country: parsed.data.country,
      });
      setProfileStatus("pending");
      setSubmitting(false);
      toast.success("Verification submitted. Awaiting admin review.");
    }, 600);
  };

  if (profileStatus === "verified") {
    return (
      <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Identity</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Verified</h1>
        <Card className="mt-8 p-8 border-border/70 text-center">
          <div className="grid place-items-center h-16 w-16 rounded-full bg-moss/10 text-moss mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 font-display text-2xl text-primary">You're verified</h2>
          <p className="mt-3 text-muted-foreground max-w-sm mx-auto">SWIFT, crypto trading and higher limits unlocked.</p>
        </Card>
      </div>
    );
  }

  if (profileStatus === "pending") {
    return (
      <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Identity</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Under review</h1>
        <Card className="mt-8 p-8 border-border/70 text-center">
          <h2 className="font-display text-2xl text-primary">KYC submitted</h2>
          <p className="mt-3 text-muted-foreground max-w-sm mx-auto">Documents submitted. Admin will review shortly.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-2xl">
      <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Identity</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Verify your account</h1>
      <p className="mt-2 text-muted-foreground">Required by European banking regulations. Takes about 4 minutes.</p>

      <div className="mt-8 grid grid-cols-4 gap-2">
        {STEPS.map((s) => (
          <div key={s.id} className="flex flex-col items-center gap-2">
            <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-medium ${step >= s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground text-center hidden sm:block">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <Card className="mt-8 p-6 sm:p-8 border-border/70">
        {step === 1 && (
          <>
            <h2 className="font-display text-2xl text-primary">ID document</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choose a government-issued document.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2"><Label>Document type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passport">Passport</SelectItem>
                    <SelectItem value="National ID">National ID card</SelectItem>
                    <SelectItem value="Residence permit">Residence permit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Document number</Label>
                <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value.toUpperCase())} placeholder="C01X00T47" />
              </div>
              <div className="space-y-2"><Label>Issuing country</Label>
                <Select value={docCountry} onValueChange={setDocCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-2xl text-primary">Selfie check</h2>
            <p className="mt-2 text-sm text-muted-foreground">Demo — click below to simulate.</p>
            <div className="mt-6 grid place-items-center">
              <button
                type="button"
                onClick={() => { setSelfieDone(true); toast.success("Selfie captured"); }}
                className={`h-48 w-48 rounded-full border-2 border-dashed grid place-items-center transition-all ${selfieDone ? "border-moss bg-moss/10" : "border-border hover:border-primary"}`}
              >
                {selfieDone ? <CheckCircle2 className="h-12 w-12 text-moss" /> : <Camera className="h-12 w-12 text-muted-foreground" />}
              </button>
              <p className="mt-4 text-sm text-muted-foreground">{selfieDone ? "Looks good." : "Tap to capture selfie"}</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-2xl text-primary">Residential address</h2>
            <p className="mt-2 text-sm text-muted-foreground">Where you receive post.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2"><Label>Street and number</Label><Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Brückenstraße 12" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Postal code</Label><Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="10179" /></div>
                <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" /></div>
              </div>
              <div className="space-y-2"><Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-display text-2xl text-primary">Review</h2>
            <p className="mt-2 text-sm text-muted-foreground">Check everything is correct, then submit.</p>
            <dl className="mt-6 divide-y divide-border text-sm">
              <div className="grid grid-cols-2 py-3"><dt className="text-muted-foreground">Document</dt><dd>{docType} · {docNumber}</dd></div>
              <div className="grid grid-cols-2 py-3"><dt className="text-muted-foreground">Issued in</dt><dd>{docCountry}</dd></div>
              <div className="grid grid-cols-2 py-3"><dt className="text-muted-foreground">Selfie</dt><dd>{selfieDone ? "✓ Captured" : "Missing"}</dd></div>
              <div className="grid grid-cols-2 py-3"><dt className="text-muted-foreground">Address</dt><dd>{addressLine}, {postal} {city}, {country}</dd></div>
            </dl>
          </>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</Button>
          {step < 4 ? (
            <Button variant="hero" onClick={() => setStep((s) => Math.min(4, s + 1))}>Continue</Button>
          ) : (
            <Button variant="hero" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit verification"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Verify;