import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
  const { user, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname?: string } } };
  const redirectTo = loc.state?.from?.pathname || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"creds" | "twofa">("creds");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) nav(redirectTo, { replace: true });
  }, [user, nav, redirectTo]);

  const handleCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
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
      if (mode === 'signup') {
        await signUp(email, password, fullName);
        toast.success("Account created successfully. Welcome to AgriBank.");
      } else {
        await signIn(email, password);
        toast.success("Signed in successfully.");
      }
      nav(redirectTo, { replace: true });
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
              {/* Mode toggle */}
              <div className="flex border-b border-border mb-6">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${
                    mode === "signin"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${
                    mode === "signup"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create account
                </button>
              </div>

              <h1 className="font-display text-3xl text-primary">
                {mode === "signup" ? "Open an account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Join AgriBank today. Takes less than 2 minutes."
                  : "Sign in to your AgriBank account."}
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleCreds}>
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pwd">Password</Label>
                  <Input id="pwd" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  {mode === 'signup' && <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>}
                </div>
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="cpwd">Confirm password</Label>
                    <Input id="cpwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Continue"}
                </Button>
                {mode === 'signin' && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    <button type="button" onClick={() => toast.info("Please contact support@agribank.com to reset your password.")} className="hover:underline">
                      Forgot password?
                    </button>
                  </p>
                )}
              </form>
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
