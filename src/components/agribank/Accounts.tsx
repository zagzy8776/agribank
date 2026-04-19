import { ArrowDownRight, ArrowUpRight, Coffee, ShoppingBag, Building2, Plane } from "lucide-react";

const transactions = [
  { icon: Building2, label: "Salary — Studio Lehmann", note: "April payroll", amount: "+€3,420.00", up: true },
  { icon: Plane, label: "Lufthansa", note: "Travel", amount: "−€186.40", up: false },
  { icon: ShoppingBag, label: "Carrefour Paris 11e", note: "Groceries", amount: "−€42.18", up: false },
  { icon: Coffee, label: "Café Procope", note: "Coffee", amount: "−€4.80", up: false },
];

export const Accounts = () => {
  return (
    <section id="accounts" className="py-24 md:py-32 bg-cream">
      <div className="container grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Your accounts</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-[1.05] text-balance">
            One ledger for every part of your life.
          </h2>
          <p className="mt-6 text-lg text-foreground/70 max-w-lg">
            Multi-currency IBAN accounts in EUR, GBP, USD, CHF and PLN. Sub-accounts for rent, holidays and savings. Real-time SEPA Instant in under 10 seconds.
          </p>
          <ul className="mt-8 space-y-4 text-foreground/80">
            {[
              "Free SEPA & SEPA Instant transfers, Europe-wide",
              "SWIFT to 200+ countries with live FX",
              "Apple Pay, Google Pay and contactless from day one",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mock dashboard card */}
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-warm opacity-20 blur-3xl rounded-[3rem]" aria-hidden />
          <div className="relative rounded-3xl bg-card shadow-card border border-border overflow-hidden">
            {/* Balance header */}
            <div className="p-8 bg-gradient-field text-primary-foreground">
              <p className="text-xs uppercase tracking-[0.22em] opacity-70">Main account · DE89 3704 …</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-5xl">€8,392</span>
                <span className="font-display text-2xl opacity-70">.50</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-accent">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +€1,180 this month
              </div>
            </div>

            {/* Transactions */}
            <div className="divide-y divide-border">
              {transactions.map((t) => (
                <div key={t.label} className="flex items-center gap-4 px-6 py-4">
                  <div className="grid place-items-center h-10 w-10 rounded-full bg-secondary text-primary">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.note}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${t.up ? "text-moss" : "text-foreground"}`}>
                    {t.up ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    {t.amount}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="grid grid-cols-3 border-t border-border bg-secondary/40">
              {["Send", "Request", "Convert"].map((a) => (
                <button key={a} className="py-4 text-sm font-medium text-primary hover:bg-secondary transition-colors">
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
