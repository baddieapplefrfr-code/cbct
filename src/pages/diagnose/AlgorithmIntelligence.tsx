import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

export default function AlgorithmIntelligence() {
  const { channel, videos, loading: dataLoading, channelContext } = useChannelData();
  const [tab, setTab] = useState("patterns");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (channel && videos.length > 0 && !data) analyse(); }, [channel, videos]);

  async function analyse() {
    setLoading(true);
    setStep(0);
    try {
      setStep(1);
      const res = await callAI(
        "You are a YouTube algorithm expert. Analyse this channel's performance patterns. Return JSON: { best_day: string, best_time: string, best_length: string, best_topics: [string], sweet_spot: string, heatmap: [{day: string, slots: [number]}], competitor_gaps: [{day: string, time: string, competition: string}], seasonal_alerts: [{event: string, dates: string, advice: string, type: string}] }",
        channelContext
      );
      setStep(2);
      setData(parseJsonFromAI(res));
    } catch {}
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="🧬" title="Algorithm Intelligence" description="Your algorithm patterns and best posting times">
        <LoadingSteps steps={["Loading data...", "Analysing algorithm patterns...", "Done"]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🧬" title="Algorithm Intelligence" description="Your algorithm patterns and best posting times">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="patterns">Your Algorithm Patterns</TabsTrigger>
          <TabsTrigger value="timing">Best Time to Post</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-8">
          {data ? (
            <>
              {/* Sweet Spot */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-6 text-center" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)", boxShadow: "0 0 24px hsl(var(--primary) / 0.08)" }}>
                <p className="t-label text-primary mb-2">Your Sweet Spot</p>
                <p className="text-lg font-bold">{data.sweet_spot}</p>
              </motion.div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="cb-card"><p className="t-label text-muted-foreground mb-1">Best Day</p><p className="text-xl font-bold">{data.best_day}</p></div>
                <div className="cb-card"><p className="t-label text-muted-foreground mb-1">Best Time</p><p className="text-xl font-bold">{data.best_time}</p></div>
                <div className="cb-card"><p className="t-label text-muted-foreground mb-1">Best Length</p><p className="text-xl font-bold">{data.best_length}</p></div>
              </div>

              {data.best_topics && (
                <div>
                  <h3 className="t-label text-muted-foreground mb-3">Best Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.best_topics.map((t: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                        #{i+1} {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <p className="text-center text-muted-foreground py-12">No data</p>}
        </TabsContent>

        <TabsContent value="timing" className="space-y-8">
          {data ? (
            <>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <p className="data-number-xl" style={{ fontSize: "52px", fontWeight: 800, color: "hsl(var(--primary))" }}>
                  {data.best_day} {data.best_time}
                </p>
                <p className="text-lg text-muted-foreground mt-2">Your optimal upload window</p>
              </motion.div>

              {data.seasonal_alerts && (
                <div>
                  <h3 className="t-label text-muted-foreground mb-3">Seasonal Alerts</h3>
                  <div className="space-y-2">
                    {data.seasonal_alerts.map((a: any, i: number) => (
                      <div key={i} className="cb-card flex items-start gap-3">
                        <span className="text-lg">{a.type === "opportunity" ? "🟢" : "🔴"}</span>
                        <div>
                          <p className="text-sm font-semibold">{a.event}</p>
                          <p className="text-xs text-muted-foreground">{a.dates} — {a.advice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <p className="text-center text-muted-foreground py-12">No data</p>}
        </TabsContent>
      </Tabs>
    </FeaturePage>
  );
}
