import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";
import ShareInsight from "@/components/ShareInsight";

export default function AudienceIntelligence() {
  const { channel, videos, loading: dataLoading, channelContext } = useChannelData();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (channel && videos.length > 0 && !data) analyse(); }, [channel, videos]);

  async function analyse() {
    setLoading(true); setStep(0);
    try {
      setStep(1);
      const res = await callAI(
        "Analyse this YouTube channel's audience. Return JSON: { top_converter: {title: string, rate: number}, avg_conversion: number, best_format: string, worst_format: string, persona: {name: string, age_range: string, interests: [string], pain_points: [string], content_preferences: [string]}, conversion_by_format: [{format: string, rate: number}], cta_timing: string }",
        channelContext
      );
      setStep(2);
      setData(parseJsonFromAI(res));
    } catch {}
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="👥" title="Audience Intelligence" description="Who your audience is and what converts them">
        <LoadingSteps steps={["Analysing audience...", "Building persona...", "Done"]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="👥" title="Audience Intelligence" description="Who your audience is and what converts them">
      {data ? (
        <div className="space-y-8">
          {/* Layer 1 — Best converter */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <p className="text-lg text-muted-foreground">Best converting format</p>
            <p className="data-number-xl" style={{ fontSize: "42px", fontWeight: 800, color: "hsl(var(--primary))" }}>{data.best_format}</p>
            <p className="text-sm text-muted-foreground">converts {data.avg_conversion}x better than your average</p>
          </motion.div>

          {/* Persona card */}
          {data.persona && (
            <div className="cb-card space-y-3" style={{ borderLeft: "4px solid hsl(var(--info))" }}>
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>Your Ideal Viewer</p>
              <p className="text-lg font-bold">{data.persona.name}</p>
              <p className="text-sm text-muted-foreground">{data.persona.age_range}</p>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <p className="text-xs font-semibold mb-1">Interests</p>
                  <div className="flex flex-wrap gap-1">{data.persona.interests?.map((i: string) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info">{i}</span>)}</div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">Pain Points</p>
                  <div className="flex flex-wrap gap-1">{data.persona.pain_points?.map((p: string) => <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{p}</span>)}</div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">Preferences</p>
                  <div className="flex flex-wrap gap-1">{data.persona.content_preferences?.map((c: string) => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{c}</span>)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Conversion by format */}
          {data.conversion_by_format && (
            <div className="cb-card">
              <p className="t-label text-muted-foreground mb-3">Conversion by Format</p>
              {data.conversion_by_format.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <span className="text-sm w-24">{f.format}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                    <div className="h-full rounded-full bg-primary bar-animate" style={{ width: `${Math.min(f.rate * 10, 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{f.rate}%</span>
                </div>
              ))}
            </div>
          )}

          {data.cta_timing && (
            <div className="rounded-xl p-5" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
              <p className="t-label text-primary mb-1">CTA Timing</p>
              <p className="text-sm">{data.cta_timing}</p>
            </div>
          )}

          <ShareInsight title="Audience Intelligence" value={data.best_format} subtitle={`Your ideal viewer: ${data.persona?.name || "—"}`} />
        </div>
      ) : <p className="text-muted-foreground text-center py-12">No data available</p>}
    </FeaturePage>
  );
}
