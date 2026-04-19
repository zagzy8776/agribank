import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [twoFa, setTwoFa] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setName(data?.full_name || "");
      setPhone(data?.phone || "");
      setTwoFa(!!data?.two_fa_enabled);
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({
      full_name: name.trim().slice(0, 80),
      phone: phone.trim().slice(0, 30),
      two_fa_enabled: twoFa,
    }).eq("user_id", user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 lg:py-12 max-w-2xl">
      <p className="text-xs uppercase tracking-[0.22em] text-moss font-medium">Settings</p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl text-primary">Your profile</h1>

      <Card className="mt-8 p-6 sm:p-8 border-border/70">
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" /></div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div>
              <p className="font-medium text-sm">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">Required at sign-in and for transfers above €1,000.</p>
            </div>
            <Switch checked={twoFa} onCheckedChange={setTwoFa} />
          </div>
          <Button type="submit" variant="hero">Save changes</Button>
        </form>
      </Card>

      <Card className="mt-6 p-6 border-border/70">
        <h2 className="font-display text-xl text-primary">KYC status</h2>
        <p className="mt-2 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            profile?.kyc_status === "verified" ? "bg-moss/15 text-moss" : "bg-accent/15 text-accent-foreground"
          }`}>
            {profile?.kyc_status?.replace("_", " ") || "not started"}
          </span>
        </p>
      </Card>
    </div>
  );
};

export default Settings;
