import { Globe2, Sparkles, Receipt, LineChart, CreditCard, Bitcoin } from "lucide-react";

const tools = [
  {
    icon: Globe2,
    title: "International transfers",
    body: "SEPA across 36 countries in seconds. SWIFT to 200+ countries with live FX and transparent fees.",
  },
  {
    icon: Bitcoin,
    title: "Crypto, simply",
    body: "Buy and sell BTC, ETH, SOL and more in EUR. Settle instantly from your main account, no exchange to set up.",
  },
  {
    icon: CreditCard,
    title: "Cards that work everywhere",
    body: "Virtual and physical cards. Apple Pay, Google Pay. Freeze, unfreeze and set spending limits in a tap.",
  },
  {
    icon: Receipt,
    title: "Smart spending",
    body: "Auto-categorised transactions, monthly insights and effortless splits. Your money, finally legible.",
  },
  {
    icon: LineChart,
    title: "Multi-currency wallets",
    body: "Hold and convert EUR, GBP, USD, CHF and PLN at the real rate. No hidden mark-ups, ever.",
  },
  {
    icon: Sparkles,
    title: "Designed in Europe",
    body: "PSD2-compliant, GDPR-first, two-factor by default. A calm interface in twelve languages.",
  },
];

export const Tools = () => {
  return (
    <section id="tools" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Everything you need</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-primary leading-[1.05] text-balance">
            One account. Every part of your financial life.
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {tools.map((t) => (
            <div
              key={t.title}
              className="group p-8 lg:p-10 bg-card hover:bg-secondary/50 transition-colors duration-500"
            >
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary/5 text-primary group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-500">
                <t.icon className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h3 className="mt-6 font-display text-2xl text-primary">{t.title}</h3>
              <p className="mt-3 text-foreground/70 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
