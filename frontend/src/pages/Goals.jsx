import { useState } from "react";
import { Target, Plus, Pencil, Trash2, CheckCircle2, Flag } from "lucide-react";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { PageHeader, Loader, EmptyState, StatusBadge } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FIELDS = [
  { name: "title", label: "Goal", type: "text", required: true },
  { name: "type", label: "Timeframe", type: "select", options: ["daily", "weekly", "monthly", "yearly", "lifetime"], default: "monthly" },
  { name: "status", label: "Status", type: "select", options: ["active", "in_progress", "done"], default: "active" },
  { name: "progress", label: "Progress (%)", type: "number", default: 0 },
  { name: "deadline", label: "Target Date", type: "date" },
  { name: "notes", label: "Notes / Milestones", type: "textarea" },
];

const TYPES = ["daily", "weekly", "monthly", "yearly", "lifetime"];

export default function Goals() {
  const { data: goals = [], isLoading } = useResource("goals");
  const { create, update, remove } = useResourceMutations("goals", "Goal");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = filter === "all" ? goals : goals.filter((g) => (g.type || "monthly") === filter);
  const completed = goals.filter((g) => g.status === "done").length;

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const toggleDone = (g) => update.mutate({ id: g.id, payload: { status: g.status === "done" ? "active" : "done", progress: g.status === "done" ? g.progress : 100 } });

  return (
    <div>
      <PageHeader title="Goals Center" subtitle={`${completed} of ${goals.length} goals conquered.`}
        action={() => { setEditing(null); setModalOpen(true); }} actionLabel="New Goal" testid="add-btn" />

      <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-white/5 w-fit mb-6 flex-wrap">
        {["all", ...TYPES].map((t) => (
          <button key={t} onClick={() => setFilter(t)} data-testid={`filter-${t}`}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${filter === t ? "bg-lime-400 text-black" : "text-zinc-400 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {isLoading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState icon={Target} title="No goals here yet" subtitle="Set a goal and start tracking your progress to domination." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g, i) => (
            <div key={g.id} className="glass-card lift p-5 fade-up group" style={{ animationDelay: `${i * 30}ms` }} data-testid="goal-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <button onClick={() => toggleDone(g)} data-testid="toggle-goal" className="mt-0.5">
                    <CheckCircle2 className={`h-5 w-5 ${g.status === "done" ? "text-lime-400 fill-lime-400/20" : "text-zinc-600 hover:text-lime-400"}`} />
                  </button>
                  <div className="min-w-0">
                    <h3 className={`font-head text-white leading-snug ${g.status === "done" ? "line-through text-zinc-500" : ""}`}>{g.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-teal-300 flex items-center gap-1"><Flag className="h-2.5 w-2.5" /> {g.type}</span>
                      {g.deadline && <span className="text-[10px] text-zinc-500 mono">{g.deadline.slice(0, 10)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => { setEditing(g); setModalOpen(true); }} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(g)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5"><span>Progress</span><span className="mono">{g.progress || 0}%</span></div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-teal-400 transition-all" style={{ width: `${Math.min(g.progress || 0, 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        fields={FIELDS} initial={editing} label="Goal" saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">"{deleting?.title}" will be permanently removed.</AlertDialogDescription>
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
