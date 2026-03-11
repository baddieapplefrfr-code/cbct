import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import GameLoader from "@/components/GameLoader";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonSafely } from "@/lib/ai-service";
import { friendlyError } from "@/lib/errors";

const s = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

interface DayAction {
  day: number;
  action: string;
  type: string;
}

interface LaunchPlanData {
  phases: { name: string; days: string; focus: string }[];
  actions: DayAction[];
}

export default function LaunchPlan() {
  const { channel, videos, channelContext, loading: dataLoading } = useChannelData();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<LaunchPlanData | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (channel && videos.length > 0 && !plan) loadData();
  }, [channel, videos]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      setProgress(20);
      setProgress(50);
      const res = await callAI(
        `Create a 30-day growth launch plan for this YouTube creator. Return JSON: {phases: [{name: string, days: string like "Days 1-7", focus: string}], actions: [{day: number 1-30, action: string (specific actionable task), type: "optimize"|"content"|"engage"|"reach"}]}. Days 1-7 = optimization, 8-15 = new content, 16-22 = engagement, 23-30 = reach. Each action must be specific to their niche.`,
        `${channelContext}\n\nBuild the 30-day launch plan.`
      );
      setProgress(80);
      const parsed = parseJsonSafely(res);
      if (parsed) setPlan(parsed);
      setProgress(100);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  const phaseColors: Record<string, string> = {
    optimize: "var(--cat-diagnose)",
    content: "var(--cat-strategy)",
    engage: "var(--cat-analyze)",
    reach: "var(--cat-grow)",
  };

  const completedCount = Object.values(checked).filter(Boolean).length;

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="🚀" title="30-Day Launch Plan" description="Your personalized daily growth calendar">
        <GameLoader progress={progress} type="channel" message="Building your growth plan..." />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🚀" title="30-Day Launch Plan" description="Your personalized daily growth calendar">
      {error && (
        <div className="cb-card cb-card-problem mb-6">
          <p className="text-sm text-foreground">{error}</p>
          <button onClick={loadData} className="text-xs text-primary mt-2 underline">Try Again</button>
        </div>
      )}
      {plan && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plan.phases?.map((phase, i) => (
              <div key={i} className="cb-card text-center !p-4">
                <p className="t-label text-muted-foreground">{s(phase.days)}</p>
                <p className="t-card-title text-sm mt-1">{s(phase.name)}</p>
              </div>
            ))}
          </div>

          <div className="cb-card !p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="t-label text-muted-foreground">PROGRESS</span>
              <span className="text-sm font-bold">{completedCount}/30</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / 30) * 100}%` }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {plan.actions?.slice(0, 30).map((action) => {
              const done = checked[action.day];
              const color = phaseColors[action.type] || "var(--primary)";
              return (
                <motion.div
                  key={action.day}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: action.day * 0.02 }}
                  onClick={() => setChecked(p => ({ ...p, [action.day]: !p[action.day] }))}
                  className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                    done ? 'border-success/30 bg-success/5 opacity-70' : 'border-border bg-card hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="t-label" style={{ color: `hsl(${color})` }}>Day {action.day}</span>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                      done ? "bg-success border-success" : "border-muted-foreground/30"
                    }`}>
                      {done && <CheckCircle className="h-2.5 w-2.5 text-black" />}
                    </div>
                  </div>
                  <p className={`text-[11px] leading-snug ${done ? 'line-through text-muted-foreground' : ''}`}>
                    {s(action.action)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
