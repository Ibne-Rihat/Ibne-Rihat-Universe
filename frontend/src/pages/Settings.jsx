import { useState } from "react";
import { User, Mail, Shield, LogOut, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || "", bio: user?.bio || "", picture: user?.picture || "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="max-w-2xl">
      <div className="fade-up mb-8">
        <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">Account Settings</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Manage your profile and session.</p>
      </div>

      <div className="glass-card p-6 fade-up">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-lime-400/30 to-teal-400/30 flex items-center justify-center text-2xl font-semibold text-lime-300 overflow-hidden">
            {form.picture ? <img src={form.picture} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = "none"} /> : (user?.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <div className="font-head text-lg text-white">{user?.name}</div>
            <div className="text-sm text-zinc-500 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user?.email}</div>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-lime-400 mt-1"><Shield className="h-3 w-3" /> {user?.provider} · {user?.role}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-500">Display Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="field-name"
              className="bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-500">Avatar URL</Label>
            <Input value={form.picture} onChange={(e) => set("picture", e.target.value)} data-testid="settings-picture"
              className="bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50" placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.15em] text-zinc-500">Bio</Label>
            <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} data-testid="field-bio"
              className="bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50 min-h-[90px]" />
          </div>
          <Button onClick={save} disabled={saving} data-testid="save-settings"
            className="bg-lime-400 text-black hover:bg-lime-300 neon-glow font-medium">
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="glass-card p-6 mt-5 fade-up border-red-500/10">
        <h3 className="font-head text-white mb-1">Session</h3>
        <p className="text-sm text-zinc-500 mb-4">Securely end your session on this device.</p>
        <Button onClick={handleLogout} data-testid="settings-logout"
          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
          <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
