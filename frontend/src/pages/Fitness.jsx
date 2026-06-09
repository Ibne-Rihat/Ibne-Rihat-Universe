import { useState } from "react";
import { Dumbbell, Scale, Flame, Plus, Pencil, Trash2, Droplets } from "lucide-react";
import { useResource, useResourceMutations, useAnalytics } from "@/hooks/useResource";
import { StatCard, Loader } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import { Button as UIButton } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const WORKOUT_FIELDS = [
  { name: "workout", label: "Workout", type: "text", required: true },
  { name: "duration", label: "Duration (min)", type: "number", default: 0 },
  { name: "calories", label: "Calories", type: "number", default: 0 },
  { name: "protein", label: "Protein (g)", type: "number", default: 0 },
  { name: "water", label: "Water (L)", type: "number", default: 0 },
  { name: "sleep", label: "Sleep (hrs)", type: "number", default: 0 },
  { name: "date", label: "Date", type: "date" },
];
const WEIGHT_FIELDS = [
  { name: "weight", label: "Weight (kg)", type: "number", required: true, default: 0 },
  { name: "date", label: "Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Fitness() {
  const [tab, setTab] = useState("workouts");
  const resource = tab === "workouts" ? "fitness_logs" : "weight_logs";
  const fields = tab === "workouts" ? WORKOUT_FIELDS : WEIGHT_FIELDS;
  const label = tab === "workouts" ? "Workout" : "Weight";

  const { data: rows = [], isLoading } = useResource(resource);
  const { create, update, remove } = useResourceMutations(resource, label);
  const { data: analytics } = useAnalytics();
  const { data: workouts = [] } = useResource("fitness_logs");
  const { data: weights = [] } = useResource("weight_logs");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const latestWeight = weights.length ? weights[0].weight : "—";
  const avgCalories = workouts.length ? Math.round(workouts.reduce((s, w) => s + Number(w.calories || 0), 0) / workouts.length) : 0;
  const totalProtein = workouts.reduce((s, w) => s + Number(w.protein || 0), 0);

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const cols = tab === "workouts"
    ? [["workout", "Workout"], ["duration", "Min"], ["calories", "Cal"], ["protein", "Protein"], ["water", "Water"], ["sleep", "Sleep"], ["date", "Date"]]
    : [["weight", "Weight (kg)"], ["date", "Date"], ["notes", "Notes"]];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white">Fitness Center</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Track the body. Master the machine.</p>
        </div>
        <UIButton onClick={() => { setEditing(null); setModalOpen(true); }} data-testid="add-btn"
          className="bg-lime-400 text-black hover:bg-lime-300 neon-glow font-medium h-10 px-5 self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" /> Log {label}
        </UIButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Weight" value={`${latestWeight} kg`} icon={Scale} accent="lime" />
        <StatCard label="Total Workouts" value={workouts.length} icon={Dumbbell} accent="teal" />
        <StatCard label="Avg Calories" value={avgCalories} icon={Flame} accent="red" />
        <StatCard label="Total Protein" value={`${totalProtein}g`} icon={Droplets} accent="blue" />
      </div>

      <div className="glass-card p-6 fade-up">
        <h3 className="font-head text-lg text-white mb-5">Weight Trend</h3>
        {analytics?.weight_trend?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.weight_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "rgba(10,10,12,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Line type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={2.5} dot={{ fill: "#a3e635", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-zinc-600 py-12 text-center">Log your weight to see the trend.</p>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-white/5 w-fit">
        {[["workouts", "Workouts"], ["weight", "Weight Log"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? "bg-lime-400 text-black" : "text-zinc-400 hover:text-white"}`}>{l}</button>
        ))}
      </div>

      {isLoading ? <Loader /> : (
        <div className="glass-card overflow-hidden fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {cols.map(([k, l]) => <th key={k} className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500">{l}</th>)}
                  <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.15em] text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={cols.length + 1} className="px-5 py-12 text-center text-zinc-600">No logs yet.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                    {cols.map(([k]) => (
                      <td key={k} className="px-5 py-3.5 text-zinc-300">
                        {k === "date" ? <span className="mono text-xs text-zinc-500">{(r[k] || r.created_at || "").slice(0, 10)}</span>
                          : k === "weight" ? <span className="mono text-lime-400">{r[k]}</span>
                          : (r[k] ?? "—")}
                      </td>
                    ))}
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
            <AlertDialogTitle>Delete log?</AlertDialogTitle>
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
