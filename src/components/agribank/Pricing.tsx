import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Standard",
    price: "€0",
    cadence: "/ month",
    desc: "Everyday banking, free forever.",
    features: ["EUR IBAN account", "Free SEPA transfers", "Virtual debit card", "Apple & Google Pay"],
    cta: "Get started",
    variant: "outline" as const,
  },
  {
    name: "Plus",
    price: "€9",
    cadence: "/ month",
    desc: "For travellers and crypto users.",
    features: ["Multi-currency IBANs", "SWIFT international transfers", "Crypto trading in EUR", "Metal debit card"],
    cta: "Start 30-day trial",
    variant: "hero" as const,
    featured: true,
  },
  {
    name: "Business",
    price: "€39",
    cadence: "/ month",
    desc: "For founders and SMEs.",
    features: ["Unlimited cards & sub-accounts", "Bulk SEPA & SWIFT payments", "Smart bookkeeping & VAT export", "Dedicated relationship manager"],
    cta: "Talk to us",
    variant: "outline" as const,
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-cream">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Honest pricing</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-[1.05] text-balance">
            Three plans. Zero surprises.
          </h2>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-8 border transition-all duration-500 ${
                p.featured
                  ? "bg-primary text-primary-foreground border-primary shadow-elevated md:-translate-y-4"
                  : "bg-card border-border shadow-soft hover:shadow-card"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 text-[10px] uppercase tracking-[0.22em] bg-accent text-accent-foreground px-3 py-1 rounded-full">
                  Most chosen
                </span>
              )}
              <h3 className="font-display text-2xl">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl">{p.price}</span>
                <span className={p.featured ? "text-primary-foreground/60" : "text-muted-foreground"}>{p.cadence}</span>
              </div>
              <p className={`mt-3 text-sm ${p.featured ? "text-primary-foreground/70" : "text-foreground/70"}`}>{p.desc}</p>

              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.featured ? "text-accent" : "text-moss"}`} />
                    <span className={p.featured ? "text-primary-foreground/90" : "text-foreground/80"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button asChild variant={p.variant} className="w-full mt-10" size="lg">
                <Link to="/auth">{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
