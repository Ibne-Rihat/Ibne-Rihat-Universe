import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Pencil, Trash2 } from "lucide-react";
import { useResource, useResourceMutations, useAnalytics } from "@/hooks/useResource";
import { StatCard, Loader, fmtCurrency, StatusBadge } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const INCOME_FIELDS = [
  { name: "source", label: "Source", type: "select", options: ["Fiverr", "YouTube", "Hosting", "Art", "Other"], default: "Fiverr" },
  { name: "amount", label: "Amount ($)", type: "number", required: true, default: 0 },
  { name: "date", label: "Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];
const EXPENSE_FIELDS = [
  { name: "category", label: "Category", type: "select", options: ["Tools", "Software", "Marketing", "Hosting", "Hardware", "Other"], default: "Tools" },
  { name: "amount", label: "Amount ($)", type: "number", required: true, default: 0 },
  { name: "date", label: "Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const PIE_COLORS = ["#a3e635", "#2dd4bf", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa"];

export default function Money() {
  const [tab, setTab] = useState("income");
  const resource = tab === "income" ? "income" : "expenses";
  const fields = tab === "income" ? INCOME_FIELDS : EXPENSE_FIELDS;
  const label = tab === "income" ? "Income" : "Expense";

  const { data: rows = [], isLoading } = useResource(resource);
  const { create, update, remove } = useResourceMutations(resource, label);
  const { data: analytics } = useAnalytics();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const totalIncome = analytics?.income_sources?.reduce((s, x) => s + x.value, 0) || 0;
  const totalExpenses = analytics?.expense_categories?.reduce((s, x) => s + x.value, 0) || 0;
  const net = totalIncome - totalExpenses;
  const savings = net > 0 ? net * 0.3 : 0;

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">Money Center</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Every dollar tracked. Total financial command.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} data-testid="add-money-btn"
          className="bg-lime-400 text-black hover:bg-lime-300 neon-glow font-medium h-10 px-5 self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" /> New {label}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={fmtCurrency(totalIncome)} icon={Wallet} accent="lime" testid="total-income" />
        <StatCard label="Total Expenses" value={fmtCurrency(totalExpenses)} icon={TrendingDown} accent="red" testid="total-expenses" />
        <StatCard label="Net Profit" value={fmtCurrency(net)} icon={TrendingUp} accent={net >= 0 ? "teal" : "red"} testid="net-profit" />
        <StatCard label="Est. Savings" value={fmtCurrency(savings)} icon={PiggyBank} accent="blue" sub="30% of net" testid="savings" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6 fade-up">
          <h3 className="font-head text-lg text-white mb-5">Revenue vs Expenses · 12 Months</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics?.monthly || []}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "rgba(10,10,12,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="income" stroke="#a3e635" strokeWidth={2} fill="url(#gInc)" />
              <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 fade-up">
          <h3 className="font-head text-lg text-white mb-3">{tab === "income" ? "Income by Source" : "Expense Breakdown"}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={(tab === "income" ? analytics?.income_sources : analytics?.expense_categories) || []}
                dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {((tab === "income" ? analytics?.income_sources : analytics?.expense_categories) || []).map((e, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(10,10,12,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs + table */}
      <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-white/5 w-fit">
        {["income", "expenses"].map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
            className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-lime-400 text-black" : "text-zinc-400 hover:text-white"
            }`}>{t}</button>
        ))}
      </div>

      {isLoading ? <Loader /> : (
        <div className="glass-card overflow-hidden fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500">{tab === "income" ? "Source" : "Category"}</th>
                  <th className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500">Amount</th>
                  <th className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500">Date</th>
                  <th className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500">Notes</th>
                  <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.15em] text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-600">No {label.toLowerCase()} records yet.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] group" data-testid={`money-row`}>
                    <td className="px-5 py-3.5"><StatusBadge value={tab === "income" ? r.source : r.category} /></td>
                    <td className="px-5 py-3.5 mono text-lime-400">{fmtCurrency(r.amount)}</td>
                    <td className="px-5 py-3.5 text-zinc-400 mono text-xs">{(r.date || r.created_at || "").slice(0, 10)}</td>
                    <td className="px-5 py-3.5 text-zinc-500 truncate max-w-[240px]">{r.notes || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex gap-1 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(r); setModalOpen(true); }} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleting(r)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        fields={fields} initial={editing} label={label} saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">This record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { remove.mutate(deleting.id); setDeleting(null); }} data-testid="confirm-delete" className="bg-red-500/90 text-white hover:bg-red-500">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
