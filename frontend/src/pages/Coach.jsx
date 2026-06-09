import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HeartPulse, Bot, Plus, Pencil, Trash2, Clock, Dumbbell, Sparkles,
  Calendar, Pill, Utensils, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useResource, useResourceMutations } from "@/hooks/useResource";
import { Loader } from "@/components/shared";
import CrudModal from "@/components/CrudModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const CAT_ICON = { workout: Dumbbell, medicine: Pill, meal: Utensils, meeting: Calendar };

const REMINDER_FIELDS = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: ["workout", "medicine", "meal", "meeting", "habit", "custom"], default: "custom" },
  { name: "time", label: "Time (24h, e.g. 18:00)", type: "text", default: "18:00" },
  { name: "days", label: "Days", type: "select", options: ["daily", "mon", "tue", "wed", "thu", "fri", "sat", "sun"], default: "daily" },
  { name: "message", label: "Message", type: "textarea" },
  { name: "active", label: "Active", type: "select", options: ["true", "false"], default: "true" },
];

export default function Coach() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [discord, setDiscord] = useState(null);
  const [tip, setTip] = useState(null);
  const [tipLoading, setTipLoading] = useState(false);

  const { data: today } = useQuery({ queryKey: ["coach-today"], queryFn: async () => (await api.get("/coach/today")).data });
  const { data: reminders = [] } = useResource("reminders");
  const { create, update, remove } = useResourceMutations("reminders", "Reminder");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api.get("/coach/settings").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/ai/discord/status").then((r) => setDiscord(r.data)).catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data } = await api.put("/coach/settings", settings);
      setSettings(data);
      qc.invalidateQueries({ queryKey: ["coach-today"] });
      toast.success("Coach settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const getTip = async () => {
    setTipLoading(true);
    try {
      const { data } = await api.get("/coach/tip");
      setTip(data.tip);
    } catch {
      toast.error("Couldn't get a tip right now");
    } finally {
      setTipLoading(false);
    }
  };

  const handleReminderSubmit = (payload) => {
    payload.active = payload.active === "true" || payload.active === true;
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => setModalOpen(false) });
    else create.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const setPlanDay = (key, value) => setSettings((s) => ({ ...s, workout_plan: { ...s.workout_plan, [key]: value } }));

  if (!settings) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="font-head text-3xl sm:text-4xl font-semibold tracking-tighter text-white flex items-center gap-3">
          <HeartPulse className="h-8 w-8 text-lime-400" /> AI Coach
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">Your proactive assistant — workouts, reminders, check-ins, all on autopilot via Discord.</p>
      </div>

      {/* Discord status */}
      <div className={`glass-card p-5 fade-up flex items-start gap-3 ${discord?.configured ? "border-lime-400/20" : "border-orange-400/20"}`} data-testid="discord-status">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${discord?.configured ? "bg-lime-400/10" : "bg-orange-400/10"}`}>
          {discord?.configured ? <CheckCircle2 className="h-4 w-4 text-lime-400" /> : <AlertCircle className="h-4 w-4 text-orange-400" />}
        </div>
        <div>
          <p className="text-sm text-white font-medium flex items-center gap-2"><Bot className="h-4 w-4" /> Discord Bot {discord?.configured ? "Active" : "Not Connected"}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {discord?.configured
              ? "Your coach will message you on Discord at the times below."
              : "Add your DISCORD_BOT_TOKEN and DISCORD_OWNER_ID in backend/.env to activate proactive Discord messages. (See SELF_HOSTING.md.) Everything below still controls the schedule."}
          </p>
        </div>
      </div>

      {/* Today plan */}
      {today && (
        <div className="glass-card p-6 fade-up" data-testid="today-plan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head text-lg text-white">Today · {today.date}</h3>
            <Button onClick={getTip} disabled={tipLoading} className="bg-white/5 border border-white/10 text-zinc-300 hover:text-lime-400 h-9" data-testid="get-tip">
              {tipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1.5" /> Get AI Tip</>}
            </Button>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-lime-400/5 border border-lime-400/10">
            <Dumbbell className="h-5 w-5 text-lime-400 mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-lime-400">Today's Workout</div>
              <div className="text-sm text-white mt-1">{today.workout_focus}</div>
            </div>
          </div>
          {today.reminders?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {today.reminders.map((r, i) => {
                const Icon = CAT_ICON[r.category] || Clock;
                return (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <Icon className="h-4 w-4 text-teal-300" />
                    <span className="mono text-xs text-zinc-400">{r.time}</span>
                    <span className="text-sm text-zinc-300 truncate">{r.title}</span>
                  </div>
                );
              })}
            </div>
          )}
          {tip && (
            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] uppercase tracking-wider text-lime-400 mb-1.5 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Coach Tip</div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{tip}</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule settings */}
      <div className="glass-card p-6 fade-up">
        <h3 className="font-head text-lg text-white mb-5">Schedule & Timing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Setting label="Timezone">
            <Input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="bg-black/50 border-white/10 text-white" data-testid="tz-input" placeholder="Asia/Dhaka" />
          </Setting>
          <Setting label="Daily Briefing Time">
            <Input value={settings.briefing_time} onChange={(e) => setSettings({ ...settings, briefing_time: e.target.value })}
              className="bg-black/50 border-white/10 text-white" data-testid="briefing-time" placeholder="07:00" />
          </Setting>
          <Setting label="Check-in Time">
            <Input value={settings.checkin_time} onChange={(e) => setSettings({ ...settings, checkin_time: e.target.value })}
              className="bg-black/50 border-white/10 text-white" data-testid="checkin-time" placeholder="08:00" />
          </Setting>
        </div>
        <div className="flex flex-wrap gap-6 mt-5">
          <Toggle label="Send daily briefing" checked={settings.briefing_enabled} onChange={(v) => setSettings({ ...settings, briefing_enabled: v })} testid="briefing-toggle" />
          <Toggle label="Send weight/height check-in" checked={settings.checkin_enabled} onChange={(v) => setSettings({ ...settings, checkin_enabled: v })} testid="checkin-toggle" />
        </div>
        <Button onClick={saveSettings} disabled={savingSettings} className="bg-lime-400 text-black hover:bg-lime-300 neon-glow mt-6" data-testid="save-coach-settings">
          {savingSettings ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Weekly workout split */}
      <div className="glass-card p-6 fade-up">
        <h3 className="font-head text-lg text-white mb-1">Weekly Home Workout Split</h3>
        <p className="text-xs text-zinc-500 mb-5">Push day, leg day, rest — fully editable. The bot tells you each day's focus.</p>
        <div className="space-y-2">
          {DAYS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-12 text-xs uppercase tracking-wider text-lime-400/80 flex-shrink-0">{label}</span>
              <Input value={settings.workout_plan?.[key] || ""} onChange={(e) => setPlanDay(key, e.target.value)}
                className="bg-black/50 border-white/10 text-white text-sm" data-testid={`plan-${key}`} />
            </div>
          ))}
        </div>
        <Button onClick={saveSettings} disabled={savingSettings} className="bg-lime-400 text-black hover:bg-lime-300 neon-glow mt-5" data-testid="save-plan">
          {savingSettings ? "Saving..." : "Save Workout Plan"}
        </Button>
      </div>

      {/* Reminders */}
      <div className="glass-card p-6 fade-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-head text-lg text-white">Reminders</h3>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-lime-400 text-black hover:bg-lime-300 neon-glow h-9" data-testid="add-reminder">
            <Plus className="h-4 w-4 mr-1.5" /> Add Reminder
          </Button>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-zinc-600 py-6 text-center">No reminders yet. Add workout, medicine, meal or meeting reminders.</p>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => {
              const Icon = CAT_ICON[r.category] || Clock;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 group" data-testid="reminder-row">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${r.active === false ? "bg-white/5" : "bg-lime-400/10"}`}>
                    <Icon className={`h-4 w-4 ${r.active === false ? "text-zinc-600" : "text-lime-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{r.title}</div>
                    <div className="text-xs text-zinc-500 capitalize">{r.category} · {r.days === "daily" || !r.days ? "Daily" : r.days}</div>
                  </div>
                  <span className="mono text-sm text-lime-400">{r.time}</span>
                  {r.active === false && <span className="text-[10px] uppercase tracking-wider text-zinc-600">paused</span>}
                  <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing({ ...r, active: String(r.active !== false) }); setModalOpen(true); }} data-testid="edit-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-lime-400"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleting(r)} data-testid="delete-item" className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleReminderSubmit}
        fields={REMINDER_FIELDS} initial={editing} label="Reminder" saving={create.isPending || update.isPending} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">"{deleting?.title}" will be removed.</AlertDialogDescription>
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

function Setting({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-[0.15em] text-zinc-500">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, testid }) {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testid} className="data-[state=checked]:bg-lime-400" />
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
  );
}
