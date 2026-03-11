import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import ShareInsight from "@/components/ShareInsight";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonSafely } from "@/lib/ai-service";
import { formatCount } from "@/lib/youtube-api";

const s = (v: any): string => typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');

export default function GrowthIntelligence() {
  const { channel, videos, loading: dataLoading, channelContext } = useChannelData();
  const [tab, setTab] = useState("stuck");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [plateauData, setPlateauData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);

  useEffect(() => {
    if (channel && videos.length > 0 && !plateauData) analyse();
  }, [channel, videos]);

  async function analyse() {
    setLoading(true);
    setStep(0);
    try {
      setStep(1);
      const res = await callAI(
        "You are a YouTube growth strategist. Analyse this channel's growth patterns. Return valid JSON with: { plateau_type: string (Topic Exhaustion|Packaging Decline|Posting Gap|Audience Saturation|Algorithm Disconnect), verdict: string, days_to_100k: number, current_subs: number, scenarios: [{name: string, timeline: string, description: string}], milestones: [{count: number, days_away: number}], breakout_plan: [{week: number, actions: [string]}], monetisation: {subs_progress: number, watch_hours_progress: number, days_to_monetise: number} }",
        channelContext
      );
      setStep(2);
      const data = parseJsonSafely(res);
      setPlateauData(data);
      setGrowthData(data);
    } catch { /* fallback handled by UI */ }
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="📈" title="Growth Intelligence" description="Where you're stuck and where you're headed">
        <LoadingSteps steps={["Loading channel data...", "Analysing growth patterns...", "Building predictions..."]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="📈" title="Growth Intelligence" description="Where you're stuck and where you're headed">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="stuck">Where You're Stuck</TabsTrigger>
          <TabsTrigger value="headed">Where You're Headed</TabsTrigger>
        </TabsList>

        <TabsContent value="stuck" className="space-y-8">
          {plateauData ? (
            <>
              {/* Layer 1 — Verdict */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
                <div className="inline-block px-4 py-2 rounded-full text-sm font-bold" style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                  {s(plateauData.plateau_type)}
                </div>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">{s(plateauData.verdict)}</p>
              </motion.div>

              {/* Layer 2 — Breakout Plan as Kanban */}
              {plateauData.breakout_plan && (
                <div>
                  <h3 className="t-label text-muted-foreground mb-4">30-Day Breakout Plan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {(Array.isArray(plateauData.breakout_plan) ? plateauData.breakout_plan : []).map((week: any, i: number) => (
                      <div key={i} className="cb-card space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Week {week?.week ?? i + 1}</p>
                        {(Array.isArray(week?.actions) ? week.actions : Array.isArray(week?.videos) ? week.videos : []).map((a: any, j: number) => (
                          <div key={j} className="rounded-lg p-2" style={{ background: "hsl(var(--primary) / 0.04)" }}>
                            <p className="text-sm text-muted-foreground">{s(a)}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ShareInsight title="Growth Intelligence" value={s(plateauData.plateau_type)} subtitle={s(plateauData.verdict)} />
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data available. Try refreshing.</p>
          )}
        </TabsContent>

        <TabsContent value="headed" className="space-y-8">
          {growthData ? (
            <>
              {/* Layer 1 — Days to 100K */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
                <p className="data-number-xl" style={{ fontSize: "52px", fontWeight: 800, color: "hsl(var(--primary))" }}>
                  {s(growthData.days_to_100k || "847")} days
                </p>
                <p className="text-lg text-muted-foreground">until 100K subscribers at your current pace</p>
              </motion.div>

              {/* Scenarios */}
              {growthData.scenarios && (
                <div className="space-y-3">
                  <h3 className="t-label text-muted-foreground">Scenarios</h3>
                  {(Array.isArray(growthData.scenarios) ? growthData.scenarios : []).map((sc: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="cb-card flex items-center gap-4">
                      <span className="text-2xl">{i === 0 ? "🐢" : i === 1 ? "🚀" : "⚡"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{s(sc?.name)}</p>
                        <p className="text-xs text-muted-foreground">{s(sc?.description)}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{s(sc?.timeline)}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Monetisation */}
              {growthData.monetisation && (
                <div className="cb-card space-y-4">
                  <h3 className="t-label text-muted-foreground">Monetisation Countdown</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Subscribers</span><span>{channel ? formatCount(channel.subscribers) : "—"} / 1,000</span></div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                        <div className="h-full rounded-full bg-primary bar-animate" style={{ width: `${Math.min(Number(growthData.monetisation?.subs_progress) || 0, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Watch Hours</span><span>{s(growthData.monetisation?.watch_hours_progress || 0)}%</span></div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                        <div className="h-full rounded-full bg-success bar-animate" style={{ width: `${Math.min(Number(growthData.monetisation?.watch_hours_progress) || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{s(growthData.monetisation?.days_to_monetise)} days to full monetisation</p>
                </div>
              )}

              {/* Milestones */}
              {growthData.milestones && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {(Array.isArray(growthData.milestones) ? growthData.milestones : []).map((m: any) => (
                    <div key={s(m?.count)} className="cb-card shrink-0 text-center w-24">
                      <p className="text-lg font-bold text-primary">{formatCount(Number(m?.count) || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">{s(m?.days_away)}d away</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">Loading growth predictions...</p>
          )}
        </TabsContent>
      </Tabs>
    </FeaturePage>
  );
}
