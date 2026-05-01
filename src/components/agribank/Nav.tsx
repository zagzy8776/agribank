import { Wheat, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { href: "#accounts", label: "Accounts" },
  { href: "#tools", label: "Features" },
  { href: "#trust", label: "Trust" },
];

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/60" : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 md:h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground transition-transform group-hover:rotate-12">
            <Wheat className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-xl tracking-tight text-primary">AgriBank</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth">Open account</Link>
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Menu"
          className="md:hidden grid place-items-center h-10 w-10 rounded-full border border-border bg-card"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-foreground/80">
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              {user ? (
                <Button asChild variant="hero" className="flex-1">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="flex-1"><Link to="/auth">Sign in</Link></Button>
                  <Button asChild variant="hero" className="flex-1"><Link to="/auth">Open account</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
