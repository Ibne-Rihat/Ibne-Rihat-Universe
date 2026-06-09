import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Command } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    const run = async () => {
      if (!sessionId) {
        navigate("/login");
        return;
      }
      try {
        const { data } = await api.post("/auth/google/session", {}, { headers: { "X-Session-ID": sessionId } });
        if (data.token) localStorage.setItem("iru_token", data.token);
        setUser(data.user);
        window.history.replaceState(null, "", "/");
        navigate("/");
      } catch {
        navigate("/login");
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5">
      <div className="h-12 w-12 rounded-xl bg-lime-400 flex items-center justify-center neon-glow animate-pulse">
        <Command className="h-6 w-6 text-black" strokeWidth={2.5} />
      </div>
      <p className="text-sm text-zinc-500">Establishing secure session...</p>
    </div>
  );
}
