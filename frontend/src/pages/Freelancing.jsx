import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Clock } from "lucide-react";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { PageHeader, Loader, StatusBadge } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const PROJECT_FIELDS = [
  { name: "name", label: "Project Name", type: "text", required: true },
  { name: "client", label: "Client", type: "text" },
  { name: "status", label: "Status", type: "select", options: ["todo", "in_progress", "review", "done"], default: "todo" },
  { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"], default: "medium" },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "progress", label: "Progress (%)", type: "number", default: 0 },
  { name: "hours", label: "Time Tracked (hrs)", type: "number", default: 0 },
  { name: "notes", label: "Notes", type: "textarea" },
];

const PRIORITY = {
  low: "text-zinc-400 bg-white/5",
  medium: "text-blue-300 bg-blue-400/10",
  high: "text-orange-300 bg-orange-400/10",
  urgent: "text-red-400 bg-red-400/10",
};

export default function Freelancing() {
  const { data: projects = [], isLoading } = useResource("projects");
  const { create, update, remove } = useResourceMutations("projects", "Project");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [dragId, setDragId] = useState(null);

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const onDrop = (status) => {
    if (dragId) {
      const proj = projects.find((p) => p.id === dragId);
      if (proj && proj.status !== status) update.mutate({ id: dragId, payload: { status } });
      setDragId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Freelancing Command Center" subtitle="Drag projects across your pipeline. Total control."
        action={() => { setEditing(null); setModalOpen(true); }} actionLabel="New Project" testid="add-btn" />

      {isLoading ? <Loader /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = projects.filter((p) => (p.status || "todo") === col.key);
            return (
              <div key={col.key} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.key)}
                className="glass-card p-3 min-h-[200px] border-white/5" data-testid={`column-${col.key}`}>
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <span className="text-xs uppercase tracking-[0.15em] text-zinc-400">{col.label}</span>
                  <span className="mono text-xs text-zinc-600">{items.length}</span>
                </div>
                <div className="space-y-2.5">
                  {items.map((p) => (
                    <div key={p.id} draggable onDragStart={() => setDragId(p.id)}
                      className="rounded-xl bg-white/[0.03] border border-white/5 p-3.5 cursor-grab active:cursor-grabbing hover:border-lime-400/20 transition-colors group"
                      data-testid="project-card">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-head text-sm text-white leading-snug">{p.name}</h4>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(p); setModalOpen(true); }} data-testid="edit-item" className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => setDeleting(p)} data-testid="delete-item" className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      {p.client && <div className="text-xs text-zinc-500 mt-1">{p.client}</div>}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {p.priority && <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${PRIORITY[p.priority] || PRIORITY.medium}`}>{p.priority}</span>}
                        {p.deadline && <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{p.deadline.slice(0, 10)}</span>}
                      </div>
                      {p.progress > 0 && (
                        <div className="h-1 rounded-full bg-white/5 mt-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-lime-400 to-teal-400" style={{ width: `${Math.min(p.progress, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-center text-xs text-zinc-700 py-6">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        fields={PROJECT_FIELDS} initial={editing} label="Project" saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">"{deleting?.name}" will be permanently removed.</AlertDialogDescription>
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
