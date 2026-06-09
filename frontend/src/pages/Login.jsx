import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth, formatApiError } from "@/context/AuthContext";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        navigate("/");
      } else if (mode === "register") {
        await register(form.name, form.email, form.password);
        navigate("/");
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email: form.email });
        toast.success("If that email exists, a reset link was generated (check server logs).");
        setMode("login");
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative">
      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="h-11 w-11 rounded-xl bg-lime-400 flex items-center justify-center neon-glow">
              <Command className="h-6 w-6 text-black" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="font-head text-3xl font-bold tracking-tighter text-white">IBNE RIHAT UNIVERSE</h1>
          <p className="text-sm text-zinc-500 mt-2 tracking-wide">Build. Grow. Dominate.</p>
        </div>

        <div className="glass rounded-2xl p-7">
          <div className="flex gap-1 mb-6 p-1 rounded-lg bg-black/40 border border-white/5">
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} data-testid={`tab-${m}`}
                className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                  mode === m ? "bg-lime-400 text-black" : "text-zinc-400 hover:text-white"
                }`}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field icon={User} label="Name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Ibne Rihat"
                  data-testid="name-input" className="pl-10 bg-black/50 border-white/10 text-white h-11 focus:ring-1 focus:ring-lime-400/50" />
              </Field>
            )}
            <Field icon={Mail} label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="you@email.com"
                data-testid="email-input" className="pl-10 bg-black/50 border-white/10 text-white h-11 focus:ring-1 focus:ring-lime-400/50" />
            </Field>
            {mode !== "forgot" && (
              <Field icon={Lock} label="Password">
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} placeholder="••••••••"
                  data-testid="password-input" className="pl-10 bg-black/50 border-white/10 text-white h-11 focus:ring-1 focus:ring-lime-400/50" />
              </Field>
            )}

            {error && <p className="text-sm text-red-400" data-testid="auth-error">{error}</p>}

            {mode === "login" && (
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="text-xs text-zinc-500 hover:text-lime-400 transition-colors">
                Forgot password?
              </button>
            )}

            <Button type="submit" disabled={loading} data-testid="submit-auth"
              className="w-full h-11 bg-lime-400 text-black hover:bg-lime-300 neon-glow font-semibold">
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link"}
              {!loading && <ArrowRight className="h-4 w-4 ml-1.5" />}
            </Button>
          </form>

          {mode === "forgot" && (
            <button onClick={() => setMode("login")} className="text-xs text-zinc-500 hover:text-white mt-4 w-full text-center">
              Back to sign in
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-zinc-600 mt-6">A premium personal operating system.</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-[0.15em] text-zinc-500">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
        {children}
      </div>
    </div>
  );
}