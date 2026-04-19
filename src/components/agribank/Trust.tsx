import { ShieldCheck, Lock, Building2, Leaf } from "lucide-react";
import still from "@/assets/still-life.jpg";

const items = [
  { icon: ShieldCheck, title: "€100,000 guaranteed", body: "Deposits protected under European Deposit Guarantee schemes." },
  { icon: Lock, title: "Bank-grade security", body: "Biometric login, hardware-key 2FA, PSD2-compliant Strong Customer Authentication." },
  { icon: Building2, title: "Licensed in the EU", body: "Authorised credit institution, supervised by the BaFin and ECB." },
  { icon: Leaf, title: "Climate-aligned", body: "Net-zero operations since 2024. We invest reserves only in regenerative agriculture." },
];

export const Trust = () => {
  return (
    <section id="trust" className="py-24 md:py-32 bg-background">
      <div className="container grid lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-32">
          <div className="rounded-3xl overflow-hidden shadow-card border border-border">
            <img
              src={still}
              alt="Linen, wheat and a brass key — symbols of trust"
              loading="lazy"
              width={1200}
              height={900}
              className="w-full h-auto"
            />
          </div>
          <p className="mt-6 text-sm text-muted-foreground italic font-display">
            "A bank should feel like a key, not a vault."
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Trust, by design</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-[1.05] text-balance">
            Old-world stewardship. New-world technology.
          </h2>

          <div className="mt-12 space-y-px bg-border rounded-2xl overflow-hidden border border-border">
            {items.map((it) => (
              <div key={it.title} className="bg-card p-8 flex gap-6 items-start">
                <div className="grid place-items-center h-12 w-12 rounded-full bg-secondary text-primary shrink-0">
                  <it.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-primary">{it.title}</h3>
                  <p className="mt-2 text-foreground/70 leading-relaxed">{it.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
