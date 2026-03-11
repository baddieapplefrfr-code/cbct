import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface UploadTimeData {
  heatmap: { day: string; hour: number; avg_views: number }[];
  best_slot: { day: string; time: string; avg_views: number };
  worst_slot: { day: string; time: string; avg_views: number };
  recommendation: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

export default function BestUploadTime() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<UploadTimeData | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 20);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);

      const result = await callGroq(
        `Analyse when this creator uploads and the performance. Create a heatmap of upload times. Return JSON: {heatmap: [{day: "Mon"|"Tue"|..., hour: 6-22 even numbers only, avg_views: number}] with at least 15 entries covering different day/hour combos, best_slot: {day, time, avg_views}, worst_slot: {day, time, avg_views}, recommendation: string}`,
        `${context}\n\nAnalyse upload timing patterns and performance.`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getHeatValue(day: string, hour: number): number {
    if (!data?.heatmap) return 0;
    const entry = data.heatmap.find(h => h.day === day && h.hour === hour);
    return entry?.avg_views || 0;
  }

  const maxViews = data?.heatmap ? Math.max(...data.heatmap.map(h => h.avg_views), 1) : 1;

  if (loading) return (
    <FeaturePage emoji="🕐" title="Best Upload Time Finder" description="Find exactly when your audience is most active">
      <LoadingSteps steps={["Loading upload data...", "Analysing timing patterns...", "Building heatmap..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="🕐" title="Best Upload Time Finder" description="Find exactly when your audience is most active">
      {data && (
        <div className="space-y-8">
          {/* Best/Worst slots */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-success/20 bg-success/5 p-5 text-center">
              <p className="text-xs uppercase text-success font-semibold mb-1">🏆 Best Slot</p>
              <p className="data-number">{data.best_slot.day} {data.best_slot.time}</p>
              <p className="text-sm text-muted-foreground">{formatCount(data.best_slot.avg_views)} avg views</p>
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
              <p className="text-xs uppercase text-destructive font-semibold mb-1">💀 Worst Slot</p>
              <p className="text-2xl font-bold">{data.worst_slot.day} {data.worst_slot.time}</p>
              <p className="text-sm text-muted-foreground">{formatCount(data.worst_slot.avg_views)} avg views</p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
            <h2 className="section-header mb-4 flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Upload Performance Heatmap</h2>
            <div className="min-w-[500px]">
              <div className="grid" style={{ gridTemplateColumns: `80px repeat(${HOURS.length}, 1fr)` }}>
                <div />
                {HOURS.map(h => (
                  <div key={h} className="text-center text-xs text-muted-foreground pb-2">{h}:00</div>
                ))}
                {DAYS.map(day => (
                  <>
                    <div key={day} className="text-xs text-muted-foreground flex items-center pr-2">{day}</div>
                    {HOURS.map(hour => {
                      const val = getHeatValue(day, hour);
                      const intensity = maxViews > 0 ? val / maxViews : 0;
                      return (
                        <div key={`${day}-${hour}`} className="p-0.5">
                          <div
                            className="h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors"
                            style={{
                              backgroundColor: intensity > 0
                                ? `hsla(48, 96%, 53%, ${Math.max(intensity * 0.8, 0.05)})`
                                : 'hsl(var(--secondary))',
                              color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'
                            }}
                          >
                            {val > 0 ? formatCount(val) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/10 p-6 text-center">
            <p className="text-xs font-semibold uppercase text-primary mb-2">🎯 Recommendation</p>
            <p className="text-lg font-medium">{data.recommendation}</p>
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
