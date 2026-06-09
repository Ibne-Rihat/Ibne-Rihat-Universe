import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrudModal({ open, onClose, onSubmit, fields, initial, label, saving }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open) {
      const base = {};
      fields.forEach((f) => {
        base[f.name] = initial?.[f.name] ?? f.default ?? "";
      });
      setForm(base);
    }
  }, [open, initial, fields]);

  const setVal = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    fields.forEach((f) => {
      if (f.type === "number") payload[f.name] = payload[f.name] === "" ? 0 : Number(payload[f.name]);
    });
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-white/10 text-white max-w-lg max-h-[88vh] overflow-y-auto" data-testid="crud-modal">
        <DialogHeader>
          <DialogTitle className="font-head text-xl tracking-tight">
            {initial ? `Edit ${label}` : `New ${label}`}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-sm">
            {initial ? `Update the details for this ${label.toLowerCase()}.` : `Fill in the details to create a new ${label.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.15em] text-zinc-500">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={form[f.name] ?? ""}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  className="bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50 min-h-[90px]"
                  data-testid={`field-${f.name}`}
                />
              ) : f.type === "select" ? (
                <Select value={String(form[f.name] ?? "")} onValueChange={(v) => setVal(f.name, v)}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white" data-testid={`field-${f.name}`}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o} className="capitalize focus:bg-lime-400/10 focus:text-lime-400">
                        {o.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  step="any"
                  required={f.required}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  className="bg-black/50 border-white/10 text-white focus:ring-1 focus:ring-lime-400/50"
                  data-testid={`field-${f.name}`}
                />
              )}
            </div>
          ))}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white" data-testid="modal-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-lime-400 text-black hover:bg-lime-300 neon-glow" data-testid="modal-save">
              {saving ? "Saving..." : initial ? "Save Changes" : `Create ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
