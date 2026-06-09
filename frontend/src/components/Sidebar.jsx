import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, KanbanSquare, Wallet, Youtube, Lightbulb,
  Dumbbell, GraduationCap, Target, Sparkles, Briefcase, Timer,
  BarChart3, UsersRound, Settings, LogOut, Command, HeartPulse,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { section: "Command", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, id: "dashboard" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, id: "analytics" },
  ]},
  { section: "Business", items: [
    { to: "/clients", label: "Clients", icon: Users, id: "clients" },
    { to: "/freelancing", label: "Freelancing", icon: KanbanSquare, id: "freelancing" },
    { to: "/money", label: "Money", icon: Wallet, id: "money" },
    { to: "/team", label: "Team", icon: UsersRound, id: "team" },
  ]},
  { section: "Content", items: [
    { to: "/youtube", label: "YouTube", icon: Youtube, id: "youtube" },
    { to: "/content-ideas", label: "Ideas", icon: Lightbulb, id: "ideas" },
    { to: "/portfolio", label: "Portfolio", icon: Briefcase, id: "portfolio" },
    { to: "/ai-tools", label: "AI Tools", icon: Sparkles, id: "aitools" },
  ]},
  { section: "Growth", items: [
    { to: "/goals", label: "Goals", icon: Target, id: "goals" },
    { to: "/learning", label: "Learning", icon: GraduationCap, id: "learning" },
    { to: "/fitness", label: "Fitness", icon: Dumbbell, id: "fitness" },
    { to: "/coach", label: "AI Coach", icon: HeartPulse, id: "coach" },
    { to: "/focus", label: "Focus", icon: Timer, id: "focus" },
  ]},
];

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="w-[260px] h-full flex flex-col bg-black/80 backdrop-blur-3xl border-r border-white/5">
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-lime-400 flex items-center justify-center neon-glow">
            <Command className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-head font-bold text-[15px] tracking-tight text-white">IBNE RIHAT</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-lime-400/80">Universe</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-600">{group.section}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  data-testid={`nav-${item.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-lime-400/10 text-lime-400 border border-lime-400/20"
                        : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`
                  }
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <NavLink to="/settings" onClick={onNavigate} data-testid="nav-settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} /> Settings
        </NavLink>
        <div className="flex items-center gap-3 px-3 py-3 mt-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-lime-400/30 to-teal-400/30 flex items-center justify-center text-xs font-semibold text-lime-300">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.name || "Owner"}</div>
            <div className="text-[10px] text-zinc-500 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} data-testid="logout-btn" className="text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
