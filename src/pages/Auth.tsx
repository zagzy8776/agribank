import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Wheat, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().min(2, "Enter your name").max(80).optional(),
});

const Auth = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname?: string } } };
  const redirectTo = loc.state?.from?.pathname || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"creds" | "twofa">("creds");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) nav(redirectTo, { replace: true });
  }, [user, nav, redirectTo]);

  const handleCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({
      email,
      password,
      fullName: mode === "signup" ? fullName : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Mock 2FA: generate a 6-digit code and "send" it (toast for demo).
      const c = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(c);
      toast.success(`2FA code sent to ${email}`, {
        description: `Demo code: ${c}`,
        duration: 8000,
      });
      setStep("twofa");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() !== generatedCode) {
      toast.error("Invalid code");
      return;
    }
    toast.success("Signed in");
    nav(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-field text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground">
            <Wheat className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="font-display text-xl">AgriBank</span>
        </Link>
        <div>
          <h2 className="font-display text-5xl xl:text-6xl leading-[1.05] text-balance">
            European banking, considered.
          </h2>
          <p className="mt-6 text-primary-foreground/75 max-w-md">
            Multi-currency accounts, instant SEPA, SWIFT worldwide and a calm place for your crypto. Built in Europe, made for everyone.
          </p>
          <div className="mt-10 flex items-center gap-2 text-sm text-primary-foreground/70">
            <ShieldCheck className="h-4 w-4" />
            Deposits guaranteed up to €100,000
          </div>
        </div>
        <p className="text-xs text-primary-foreground/50">© AgriBank SE — Frankfurt am Main</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 border-border/70 shadow-card">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground">
              <Wheat className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-xl text-primary">AgriBank</span>
          </Link>

          {step === "creds" ? (
            <>
              <h1 className="font-display text-3xl text-primary">
                {mode === "signin" ? "Welcome back" : "Open your account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to your AgriBank account."
                  : "It takes less than a minute. Verify later."}
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleCreds}>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anna Müller" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd">Password</Label>
                  <Input id="pwd" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Continue" : "Create account"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to AgriBank?" : "Already with us?"}{" "}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl text-primary">Two-step verification</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handle2FA}>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="text-center text-2xl tracking-[0.5em] font-display" />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full">Verify & continue</Button>
                <button type="button" onClick={() => setStep("creds")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  Use a different account
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
