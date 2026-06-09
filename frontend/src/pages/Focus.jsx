import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Timer, Brain, Flame } from "lucide-react";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { StatCard, fmtCurrency } from "@/components/shared";
import { toast } from "sonner";

const PRESETS = [
  { label: "Quick Focus", min: 25 },
  { label: "Deep Work", min: 50 },
  { label: "Flow State", min: 90 },
];

export default function Focus() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [seconds, setSeconds] = useState(PRESETS[0].min * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const { data: sessions = [] } = useResource("focus_sessions");
  const { create } = useResourceMutations("focus_sessions", "Session");

  const totalMinutes = sessions.reduce((s, x) => s + Number(x.duration || 0), 0);
  const todayCount = sessions.filter((s) => (s.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            handleComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleComplete = () => {
    setRunning(false);
    create.mutate({ label: preset.label, duration: preset.min, completed_at: new Date().toISOString() });
    toast.success(`${preset.min} min ${preset.label} complete! 🔥`);
    setSeconds(preset.min * 60);
  };

  const selectPreset = (p) => {
    setPreset(p);
    setSeconds(p.min * 60);
    setRunning(false);
  };

  const reset = () => { setRunning(false); setSeconds(preset.min * 60); };

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / (preset.min * 60);
  const circumference = 2 * Math.PI * 130;

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">Focus Mode</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Enter deep work. Track every minute of mastery.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Focus" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} icon={Brain} accent="lime" />
        <StatCard label="Sessions" value={sessions.length} icon={Timer} accent="teal" />
        <StatCard label="Today" value={todayCount} icon={Flame} accent="red" />
      </div>

      <div className="glass-card p-8 sm:p-12 flex flex-col items-center fade-up" data-testid="focus-timer">
        <div className="flex gap-2 mb-10 flex-wrap justify-center">
          {PRESETS.map((p) => (
            <button key={p.min} onClick={() => selectPreset(p)} data-testid={`preset-${p.min}`}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                preset.min === p.min ? "bg-lime-400 text-black neon-glow" : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
              }`}>
              {p.min} min · {p.label}
            </button>
          ))}
        </div>

        <div className="relative w-[300px] h-[300px] flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width="300" height="300">
            <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="150" cy="150" r="130" fill="none" stroke="#a3e635" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 8px rgba(163,230,53,0.5))" }} />
          </svg>
          <div className="text-center">
            <div className="mono text-6xl font-light text-white tracking-tighter">{mins}:{secs}</div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mt-2">{preset.label}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-10">
          <button onClick={() => setRunning((r) => !r)} data-testid="focus-toggle"
            className="h-14 w-14 rounded-full bg-lime-400 text-black flex items-center justify-center hover:bg-lime-300 neon-glow transition-all">
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
          <button onClick={reset} data-testid="focus-reset"
            className="h-14 w-14 rounded-full bg-white/5 border border-white/10 text-zinc-400 flex items-center justify-center hover:text-white transition-all">
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="glass-card p-6 fade-up">
        <h3 className="font-head text-lg text-white mb-4">Session History</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-600 py-6 text-center">No sessions yet. Start your first deep work block.</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-lime-400" />
                  <span className="text-sm text-zinc-300">{s.label || "Focus"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="mono text-sm text-lime-400">{s.duration} min</span>
                  <span className="mono text-xs text-zinc-600">{(s.created_at || "").slice(0, 16).replace("T", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
