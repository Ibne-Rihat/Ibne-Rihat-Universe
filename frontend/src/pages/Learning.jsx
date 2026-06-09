import { useState } from "react";
import { GraduationCap, Plus, Pencil, Trash2, Trophy, Zap } from "lucide-react";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { PageHeader, Loader, EmptyState } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FIELDS = [
  { name: "skill", label: "Skill", type: "select", options: ["Coding", "Web Development", "Video Editing", "Photoshop", "AI Tools", "Business", "English", "Marketing"], default: "Coding" },
  { name: "level", label: "Level", type: "number", default: 1 },
  { name: "xp", label: "XP", type: "number", default: 0 },
  { name: "progress", label: "Progress (%)", type: "number", default: 0 },
  { name: "resources", label: "Resources", type: "textarea" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Learning() {
  const { data: skills = [], isLoading } = useResource("learning_progress");
  const { create, update, remove } = useResourceMutations("learning_progress", "Skill");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const totalXP = skills.reduce((s, x) => s + Number(x.xp || 0), 0);
  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div>
      <PageHeader title="Learning Center" subtitle={`Level up every skill. Total XP: ${totalXP.toLocaleString()}`}
        action={() => { setEditing(null); setModalOpen(true); }} actionLabel="Track Skill" testid="add-btn" />

      {isLoading ? <Loader /> : skills.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No skills tracked yet" subtitle="Add a skill to start earning XP and leveling up." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s, i) => (
            <div key={s.id} className="glass-card lift p-5 fade-up group" style={{ animationDelay: `${i * 30}ms` }} data-testid="skill-card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-head text-white">{s.skill}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-lime-400 flex items-center gap-1"><Trophy className="h-3 w-3" /> Level {s.level || 1}</span>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Zap className="h-3 w-3 text-teal-300" /> {Number(s.xp || 0).toLocaleString()} XP</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(s); setModalOpen(true); }} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(s)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Progress</span><span className="mono">{s.progress || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-teal-400 transition-all" style={{ width: `${Math.min(s.progress || 0, 100)}%` }} />
                </div>
              </div>
              {s.notes && <p className="text-xs text-zinc-500 mt-3 line-clamp-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        fields={FIELDS} initial={editing} label="Skill" saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">"{deleting?.skill}" will be permanently removed.</AlertDialogDescription>
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
