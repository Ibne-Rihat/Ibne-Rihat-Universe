import { useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil, Trash2, ExternalLink, Star, Inbox } from "lucide-react";
import { MODULES } from "@/config/modules";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { PageHeader, StatusBadge, SearchBar, EmptyState, Loader, fmtCurrency } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GenericModule({ resource: forced }) {
  const params = useParams();
  const resource = forced || params.resource;
  const cfg = MODULES[resource];
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data = [], isLoading } = useResource(resource, search ? { search } : {});
  const { create, update, remove } = useResourceMutations(resource, cfg.label);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); setModalOpen(true); };

  const handleSubmit = (payload) => {
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const renderCell = (item, col) => {
    const v = item[col];
    if (col === "status" || col === "favorite") return <StatusBadge value={v} />;
    if (col === "revenue") return <span className="mono text-lime-400">{fmtCurrency(v)}</span>;
    if (col === "rating") return <span className="mono text-zinc-300">{v || 0}/5</span>;
    if (col === "views") return <span className="mono text-zinc-300">{Number(v || 0).toLocaleString()}</span>;
    return <span className="text-zinc-300">{v || <span className="text-zinc-600">—</span>}</span>;
  };

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} action={openNew} actionLabel={`New ${cfg.label}`} testid="add-btn" />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder={`Search ${cfg.label.toLowerCase()}s...`} />
      </div>

      {isLoading ? (
        <Loader />
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title={`No ${cfg.label.toLowerCase()}s yet`} subtitle={`Create your first ${cfg.label.toLowerCase()} to get started.`} />
      ) : cfg.layout === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, i) => (
            <div key={item.id} className="glass-card lift p-5 fade-up group" style={{ animationDelay: `${i * 30}ms` }} data-testid={`card-${resource}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-head font-medium text-white truncate">{item.name || item.title}</h3>
                    {item.favorite === "yes" && <Star className="h-3.5 w-3.5 text-lime-400 fill-lime-400 flex-shrink-0" />}
                  </div>
                  {item.category && <div className="text-xs text-zinc-500 mt-0.5">{item.category}</div>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(item)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {item.notes && <p className="text-sm text-zinc-500 mt-3 line-clamp-2">{item.notes}</p>}
              <div className="flex items-center justify-between mt-4">
                {item.status && <StatusBadge value={item.status} />}
                {item.rating != null && resource === "ai_tools" && <span className="mono text-xs text-zinc-400">{item.rating}/5</span>}
                {item.url && (
                  <a href={item.url.startsWith("http") ? item.url : `https://${item.url}`} target="_blank" rel="noreferrer"
                    className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 ml-auto" data-testid="launch-link">
                    Launch <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {cfg.columns.map((c) => (
                    <th key={c} className="px-5 py-3.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium whitespace-nowrap capitalize">{c.replace(/_/g, " ")}</th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group" data-testid={`row-${resource}`}>
                    {cfg.columns.map((c) => (
                      <td key={c} className="px-5 py-3.5 whitespace-nowrap">{renderCell(item, c)}</td>
                    ))}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex gap-1 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleting(item)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        fields={cfg.fields}
        initial={editing}
        label={cfg.label}
        saving={create.isPending || update.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {cfg.label}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently remove "{deleting?.name || deleting?.title}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { remove.mutate(deleting.id); setDeleting(null); }}
              data-testid="confirm-delete"
              className="bg-red-500/90 text-white hover:bg-red-500">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
