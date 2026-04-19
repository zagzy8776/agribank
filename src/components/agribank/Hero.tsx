import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import hero from "@/assets/hero-fields.jpg";

export const Hero = () => {
  return (
    <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={hero}
          alt="A European city skyline at golden hour"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      <div className="container relative">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-xs uppercase tracking-[0.18em] text-foreground/70 animate-float-up">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            European banking, for everyone
          </div>

          <h1
            className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-primary text-balance animate-float-up"
            style={{ animationDelay: "120ms" }}
          >
            A bank that feels
            <br />
            <span className="italic text-soil">like home.</span>
          </h1>

          <p
            className="mt-6 max-w-xl text-lg text-foreground/70 leading-relaxed animate-float-up"
            style={{ animationDelay: "240ms" }}
          >
            AgriBank is the modern European bank for everyday people, families and businesses.
            Multi-currency IBAN accounts, instant SEPA, SWIFT worldwide and a calm place for your crypto.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-3 animate-float-up"
            style={{ animationDelay: "360ms" }}
          >
            <Button asChild variant="hero" size="xl" className="group">
              <Link to="/auth">
                Open your account
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <a href="#tools">See features</a>
            </Button>
          </div>

          <div
            className="mt-10 flex items-center gap-3 text-sm text-foreground/60 animate-float-up"
            style={{ animationDelay: "480ms" }}
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Licensed credit institution · Deposits guaranteed up to €100,000
          </div>
        </div>
      </div>

      {/* Decorative ticker */}
      <div className="relative mt-16 md:mt-24 overflow-hidden border-y border-border/60 bg-card/50 backdrop-blur">
        <div className="flex animate-ticker py-4 gap-12 whitespace-nowrap text-sm uppercase tracking-[0.2em] text-foreground/50">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-12 shrink-0">
              <span>SEPA Instant</span><span>·</span>
              <span>SWIFT worldwide</span><span>·</span>
              <span>EUR · GBP · USD · CHF · PLN</span><span>·</span>
              <span>Crypto in EUR</span><span>·</span>
              <span>Apple & Google Pay</span><span>·</span>
              <span>Carbon-neutral cards</span><span>·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
