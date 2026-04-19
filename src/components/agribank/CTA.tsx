import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const CTA = () => {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-gradient-field text-primary-foreground p-10 md:p-20 grain">
          <div className="absolute -right-20 -bottom-20 w-[420px] h-[420px] rounded-full bg-accent/30 blur-3xl" aria-hidden />

          <div className="relative max-w-3xl">
            <h2 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.02] text-balance">
              Open your account in <span className="italic text-accent">eight minutes.</span>
            </h2>
            <p className="mt-6 text-lg text-primary-foreground/75 max-w-xl">
              No paperwork. No queues. Just your ID, a selfie, and a coffee. Your card arrives by the end of the week.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="warm" size="xl" className="group">
                <Link to="/auth">
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="ghost" size="xl" className="text-primary-foreground hover:bg-primary-foreground/10">
                Book a call
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
