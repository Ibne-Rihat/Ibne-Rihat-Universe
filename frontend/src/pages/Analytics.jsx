import { useAnalytics, useDashboard } from "@/hooks/useResource";
import { Loader, fmtCurrency, StatCard } from "@/components/shared";
import { Wallet, TrendingUp, Users, Target } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#a3e635", "#2dd4bf", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#34d399", "#fb923c"];
const tooltip = { background: "rgba(10,10,12,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" };

function ChartCard({ title, children, span }) {
  return (
    <div className={`glass-card p-6 fade-up ${span || ""}`}>
      <h3 className="font-head text-lg text-white mb-5">{title}</h3>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics();
  const { data: dash } = useDashboard();
  if (isLoading || !data) return <Loader />;

  const hasAny = (arr) => arr && arr.length > 0;
  const Empty = () => <div className="h-[240px] flex items-center justify-center text-sm text-zinc-600">No data yet.</div>;

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">Analytics Center</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Every metric, charted from your real data.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={fmtCurrency(dash?.revenue)} icon={Wallet} accent="lime" />
        <StatCard label="Net Profit" value={fmtCurrency(dash?.net_profit)} icon={TrendingUp} accent="teal" />
        <StatCard label="Clients" value={dash?.total_clients || 0} icon={Users} accent="blue" />
        <StatCard label="Goals" value={dash?.total_goals || 0} icon={Target} accent="lime" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Profit Trend · 12 Months" span="lg:col-span-2">
          {hasAny(data.monthly) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthly}>
                <defs>
                  <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltip} />
                <Area type="monotone" dataKey="profit" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#gp)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Income by Source">
          {hasAny(data.income_sources) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.income_sources} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {data.income_sources.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={tooltip} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Clients by Revenue">
          {hasAny(data.client_revenue) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.client_revenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" fill="#a3e635" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Expense Breakdown">
          {hasAny(data.expense_categories) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.expense_categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" fill="#f472b6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Skill Mastery">
          {hasAny(data.skill_levels) ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={data.skill_levels}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="progress" stroke="#a3e635" fill="#a3e635" fillOpacity={0.3} strokeWidth={2} />
                <Tooltip contentStyle={tooltip} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Goals Distribution">
          {hasAny(data.goals_distribution) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.goals_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} paddingAngle={3} label={{ fill: "#a1a1aa", fontSize: 11 }}>
                  {data.goals_distribution.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={tooltip} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  );
}
