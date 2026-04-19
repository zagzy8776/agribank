import { Wheat } from "lucide-react";

const cols = [
  { title: "Bank", links: ["Accounts", "Cards", "Transfers", "Currencies"] },
  { title: "Features", links: ["SEPA Instant", "SWIFT", "Crypto", "Insights"] },
  { title: "Company", links: ["About", "Press", "Careers", "Contact"] },
  { title: "Legal", links: ["Terms", "Privacy", "Imprint", "Complaints"] },
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-20">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground">
                <Wheat className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-2xl">AgriBank</span>
            </div>
            <p className="mt-6 text-primary-foreground/70 max-w-sm">
              Banking for everyone in Europe. Headquartered in Frankfurt, with roots from Galway to Gdańsk.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-xs uppercase tracking-[0.22em] text-accent font-medium">{c.title}</h4>
                <ul className="mt-5 space-y-3">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-primary-foreground/15 flex flex-col md:flex-row gap-4 justify-between text-xs text-primary-foreground/50">
          <p>© {new Date().getFullYear()} AgriBank SE. Authorised credit institution. Frankfurt am Main.</p>
          <p>Made with care across 14 European countries.</p>
        </div>
      </div>
    </footer>
  );
};
