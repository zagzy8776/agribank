import card from "@/assets/card-hands.jpg";
import { Wheat } from "lucide-react";

export const CardShowcase = () => {
  return (
    <section className="py-24 md:py-32 bg-primary text-primary-foreground overflow-hidden">
      <div className="container grid lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-5 order-2 lg:order-1 relative">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-elevated">
            <img
              src={card}
              alt="Farmer holding the AgriBank field card"
              loading="lazy"
              width={1024}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Floating card mock */}
          <div className="absolute -bottom-8 -right-4 md:right-8 w-64 rotate-[-6deg] rounded-2xl p-5 bg-gradient-field border border-primary-glow/40 shadow-elevated">
            <div className="flex items-center justify-between text-primary-foreground">
              <Wheat className="h-6 w-6 text-accent" />
              <span className="font-display text-sm tracking-wider">AgriBank</span>
            </div>
            <div className="mt-10 font-display text-lg tracking-[0.25em] text-primary-foreground/90">
              •••• 4271
            </div>
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-primary-foreground/60">
              <span>M. Dupont</span>
              <span>09 / 29</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 order-1 lg:order-2 lg:pl-12">
          <p className="text-xs uppercase tracking-[0.22em] text-accent font-medium">The Field Card</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-balance">
            A card as honest as the work that earns it.
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/70 max-w-xl">
            Made from 82% recycled ocean-bound plastic, accepted in 200+ countries, and zero-fee on every
            transaction in the SEPA zone. Issued instantly to your wallet, posted to your door in three days.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {[
              { k: "0%", v: "FX in EUR" },
              { k: "200+", v: "Countries" },
              { k: "82%", v: "Recycled" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-3xl md:text-4xl text-accent">{s.k}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/60">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
