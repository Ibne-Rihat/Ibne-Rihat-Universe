import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SELECT_COLORS } from "@/config/modules";

export function PageHeader({ title, subtitle, action, actionLabel = "Add New", testid }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 fade-up">
      <div>
        <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1.5">{subtitle}</p>}
      </div>
      {action && (
        <Button onClick={action} data-testid={testid || "add-btn"}
          className="bg-lime-400 text-black hover:bg-lime-300 neon-glow font-medium h-10 px-5 self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = "lime", delay = 0, testid }) {
  const colors = {
    lime: "text-lime-400 bg-lime-400/10",
    teal: "text-teal-300 bg-teal-400/10",
    red: "text-red-400 bg-red-400/10",
    blue: "text-blue-300 bg-blue-400/10",
  };
  return (
    <div className="glass-card lift p-5 fade-up" style={{ animationDelay: `${delay}ms` }} data-testid={testid}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        {Icon && <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colors[accent]}`}><Icon className="h-4 w-4" /></div>}
      </div>
      <div className="mono text-2xl sm:text-3xl font-light tracking-tighter text-white mt-3">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export function StatusBadge({ value }) {
  if (!value) return <span className="text-zinc-600 text-xs">—</span>;
  const cls = SELECT_COLORS[String(value).toLowerCase()] || "text-zinc-300 bg-white/5";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${cls}`}>
      {String(value).replace(/_/g, " ")}
    </span>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search...", testid = "search-input" }) {
  return (
    <div className="relative max-w-xs w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testid}
        className="pl-9 bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50 h-10"
      />
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon }) {
  return (
    <div className="glass-card p-14 text-center fade-up" data-testid="empty-state">
      {Icon && <Icon className="h-10 w-10 text-zinc-700 mx-auto mb-4" strokeWidth={1.3} />}
      <h3 className="font-head text-lg text-zinc-300">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-600 mt-1.5 max-w-sm mx-auto">{subtitle}</p>}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex items-center justify-center py-32" data-testid="loader">
      <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
    </div>
  );
}

export function fmtCurrency(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
