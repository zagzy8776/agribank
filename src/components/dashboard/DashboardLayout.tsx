import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Bitcoin,
  Users,
  Settings,
  LogOut,
  Wheat,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getUserById, getAllKyc, isUserFrozen } from "@/lib/mockStore";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/transfers", label: "Send & receive", icon: ArrowLeftRight },
  { to: "/dashboard/recipients", label: "Recipients", icon: Users },
  { to: "/dashboard/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/dashboard/verify", label: "Verify", icon: ShieldCheck },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const DashboardLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; kyc_status: string } | null>(null);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFrozen(isUserFrozen(user.id));
    const mockUser = getUserById(user.id);
    const allKyc = getAllKyc();
    const userKyc = allKyc.find(k => k.userId === user.id);
    setProfile({
      full_name: mockUser?.fullName || null,
      kyc_status: userKyc?.status || 'not_started',
    });
  }, [user]);

  const onSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/", { replace: true });
  };

  const SideContent = (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground">
          <Wheat className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="font-display text-xl text-primary">AgriBank</span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setMobile(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        {profile?.kyc_status !== "verified" && (
          <Link
            to="/dashboard/verify"
            onClick={() => setMobile(false)}
            className="block mb-4 p-4 rounded-xl bg-accent/15 border border-accent/30"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-accent-foreground/80 font-medium">Verify your identity</p>
            <p className="mt-1 text-sm text-foreground/80">Unlock SWIFT, higher limits and crypto trading.</p>
          </Link>
        )}
        <div className="px-3 py-3 rounded-xl bg-secondary/50 mb-3">
          <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-background/90 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
            <Wheat className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg text-primary">AgriBank</span>
        </Link>
        <button
          aria-label="Open menu"
          className="grid place-items-center h-10 w-10 rounded-full border border-border"
          onClick={() => setMobile(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobile(false)} />
          <aside className="relative w-72 bg-card p-5 flex flex-col">
            <button
              aria-label="Close"
              className="absolute right-3 top-3 grid place-items-center h-9 w-9 rounded-full hover:bg-secondary"
              onClick={() => setMobile(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {SideContent}
          </aside>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:flex sticky top-0 h-screen border-r border-border bg-card p-5 flex-col">
          {SideContent}
        </aside>
        <main className="min-w-0">
          {frozen && (
            <div className="bg-red-600 text-white px-5 py-3 text-sm text-center">
              ⚠️ Your account has been frozen. All outgoing transactions are disabled. Contact <strong>support@agribank.com</strong> to resolve.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;