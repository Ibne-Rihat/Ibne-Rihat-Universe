import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Users, TrendingUp, Target, Dumbbell, GraduationCap, Timer,
  Activity, Cloud, Calendar, Plus, ArrowUpRight, Zap,
} from "lucide-react";
import { useDashboard } from "@/hooks/useResource";
import { useAuth } from "@/context/AuthContext";
import { StatCard, Loader, fmtCurrency } from "@/components/shared";
import api from "@/lib/api";
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis,
} from "recharts";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = useClock();
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    api.get("/weather").then((r) => setWeather(r.data)).catch(() => {});
  }, []);

  if (isLoading || !data) return <Loader />;

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "Commander").split(" ")[0];

  const quickActions = [
    { label: "Add Income", to: "/money", icon: Wallet },
    { label: "New Client", to: "/clients", icon: Users },
    { label: "New Project", to: "/freelancing", icon: Target },
    { label: "Start Focus", to: "/focus", icon: Timer },
  ];

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime-400/80 mb-1">{greeting}</p>
          <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">{firstName}'s Universe</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Your complete command center — built, grown, dominated.</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="mono text-3xl font-light tracking-tighter text-white">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5 justify-end mt-0.5">
              <Calendar className="h-3 w-3" />
              {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
          {weather?.temperature != null && (
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <Cloud className="h-5 w-5 text-teal-300" />
              <div>
                <div className="mono text-lg text-white leading-none">{Math.round(weather.temperature)}°C</div>
                <div className="text-[10px] text-zinc-500 mt-1">{weather.condition}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top metrics */}
      {data.total_clients === 0 && data.revenue === 0 && data.total_goals === 0 && (
        <div className="glass-card p-5 border-lime-400/15 flex items-start gap-3 fade-up" data-testid="welcome-hint">
          <div className="h-9 w-9 rounded-lg bg-lime-400/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Welcome to your Universe.</p>
            <p className="text-xs text-zinc-500 mt-0.5">Use the quick actions below to add your first income, client, project or focus session — every widget here updates live from your real data.</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={fmtCurrency(data.revenue)} sub={`${data.total_clients} clients`} icon={Wallet} accent="lime" delay={0} testid="revenue-widget" />
        <StatCard label="Net Profit" value={fmtCurrency(data.net_profit)} sub={`${fmtCurrency(data.total_expenses)} expenses`} icon={TrendingUp} accent={data.net_profit >= 0 ? "teal" : "red"} delay={50} testid="profit-widget" />
        <StatCard label="Active Clients" value={data.active_clients} sub={`of ${data.total_clients} total`} icon={Users} accent="blue" delay={100} testid="clients-widget" />
        <StatCard label="Projects" value={data.total_projects} sub={`${data.project_status?.done || 0} completed`} icon={Target} accent="lime" delay={150} testid="projects-widget" />
      </div>

      {/* Life score + progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-6 fade-up" data-testid="life-score-widget">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Life Score</span>
            <Zap className="h-4 w-4 text-lime-400" />
          </div>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: data.life_score, fill: "#a3e635" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "rgba(255,255,255,0.05)" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mono text-4xl font-light text-white">{data.life_score}</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">/ 100</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 text-center mt-2">Composite of revenue, goals, learning & fitness</p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProgressCard label="Goal Progress" value={data.goal_progress} icon={Target} sub={`${data.total_goals} goals`} />
          <ProgressCard label="Learning" value={data.learning_progress} icon={GraduationCap} sub="skills mastered" />
          <div className="glass-card p-5 flex flex-col justify-between fade-up">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Activity</span>
              <Dumbbell className="h-4 w-4 text-teal-300" />
            </div>
            <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Workouts</span>
                <span className="mono text-lg text-white">{data.workouts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Focus sessions</span>
                <span className="mono text-lg text-white">{data.focus_sessions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((a, i) => (
          <button key={a.label} onClick={() => navigate(a.to)} data-testid={`quick-${a.label.replace(/\s/g, "-").toLowerCase()}`}
            className="glass-card lift p-4 flex items-center gap-3 text-left group fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="h-9 w-9 rounded-lg bg-lime-400/10 flex items-center justify-center group-hover:bg-lime-400/20 transition-colors">
              <a.icon className="h-4 w-4 text-lime-400" />
            </div>
            <span className="text-sm text-zinc-300 group-hover:text-white flex-1">{a.label}</span>
            <Plus className="h-4 w-4 text-zinc-600 group-hover:text-lime-400 transition-colors" />
          </button>
        ))}
      </div>

      {/* Deadlines + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-6 fade-up" data-testid="deadlines-widget">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head text-lg text-white">Upcoming Deadlines</h3>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </div>
          {data.upcoming_deadlines?.length ? (
            <div className="space-y-2.5">
              {data.upcoming_deadlines.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2 w-2 rounded-full bg-lime-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 truncate">{d.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600">{d.type}</span>
                  </div>
                  <span className="mono text-xs text-zinc-500 flex-shrink-0">{(d.date || "").slice(0, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 py-6 text-center">No upcoming deadlines. Stay ahead.</p>
          )}
        </div>

        <div className="glass-card p-6 fade-up" data-testid="activity-widget">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head text-lg text-white">Recent Activity</h3>
            <Activity className="h-4 w-4 text-zinc-500" />
          </div>
          {data.recent_activity?.length ? (
            <div className="space-y-2.5">
              {data.recent_activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <ArrowUpRight className="h-3.5 w-3.5 text-lime-400/70 flex-shrink-0" />
                  <span className="text-zinc-400 capitalize">{a.action}</span>
                  <span className="text-zinc-300 truncate flex-1">{a.title}</span>
                  <span className="mono text-[10px] text-zinc-600">{a.entity?.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 py-6 text-center">No activity yet. Make your first move.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="glass-card p-5 fade-up">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        <Icon className="h-4 w-4 text-lime-400" />
      </div>
      <div className="mono text-3xl font-light text-white mt-3">{value}%</div>
      <div className="h-1.5 rounded-full bg-white/5 mt-3 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-teal-400 transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <div className="text-xs text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}
