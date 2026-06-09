import { useState } from "react";
import { Briefcase, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { PageHeader, Loader, EmptyState, StatusBadge } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FIELDS = [
  { name: "title", label: "Project Title", type: "text", required: true },
  { name: "category", label: "Category", type: "text" },
  { name: "url", label: "Live URL", type: "url" },
  { name: "image_url", label: "Cover Image URL", type: "url" },
  { name: "status", label: "Status", type: "select", options: ["active", "completed", "in_progress"], default: "completed" },
  { name: "description", label: "Description", type: "textarea" },
];

export default function Portfolio() {
  const { data: items = [], isLoading } = useResource("portfolio_projects");
  const { create, update, remove } = useResourceMutations("portfolio_projects", "Project");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Showcase the work that builds the legacy."
        action={() => { setEditing(null); setModalOpen(true); }} actionLabel="New Project" testid="add-btn" />

      {isLoading ? <Loader /> : items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No portfolio projects yet" subtitle="Add your best work to build a stunning showcase." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p, i) => (
            <div key={p.id} className="glass-card lift overflow-hidden fade-up group" style={{ animationDelay: `${i * 30}ms` }} data-testid="portfolio-card">
              <div className="h-40 bg-gradient-to-br from-lime-400/10 to-teal-400/10 relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Briefcase className="h-10 w-10 text-white/10" /></div>
                )}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(p); setModalOpen(true); }} data-testid="edit-item" className="p-1.5 rounded-md bg-black/60 backdrop-blur text-zinc-300 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(p)} data-testid="delete-item" className="p-1.5 rounded-md bg-black/60 backdrop-blur text-zinc-300 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-head text-white truncate">{p.title}</h3>
                  {p.status && <StatusBadge value={p.status} />}
                </div>
                {p.category && <div className="text-xs text-zinc-500 mt-1">{p.category}</div>}
                {p.description && <p className="text-sm text-zinc-500 mt-3 line-clamp-2">{p.description}</p>}
                {p.url && (
                  <a href={p.url.startsWith("http") ? p.url : `https://${p.url}`} target="_blank" rel="noreferrer"
                    className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 mt-4" data-testid="visit-link">
                    Visit Project <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit}
        fields={FIELDS} initial={editing} label="Project" saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
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
