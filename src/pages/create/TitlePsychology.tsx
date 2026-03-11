import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import CopyButton from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface TitleData {
  curiosity_gap: number; emotional_trigger: number; search_power: number;
  first_word_impact: number; specificity: number; pattern_break: number;
  search_vs_browse: string; primary_emotion: string;
  predicted_ctr_tier: string; title_type: string; top_weakness: string;
  three_better_versions: { title: string; explanation: string }[];
}

const METRICS = [
  { key: "curiosity_gap", label: "Curiosity Gap", color: "--info" },
  { key: "emotional_trigger", label: "Emotional Trigger", color: "--destructive" },
  { key: "search_power", label: "Search Power", color: "--success" },
  { key: "first_word_impact", label: "First Word Impact", color: "--warning" },
  { key: "specificity", label: "Specificity", color: "--color-opportunity" },
  { key: "pattern_break", label: "Pattern Break", color: "--primary" },
];

export default function TitlePsychology() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [data, setData] = useState<TitleData | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => { if (!isChannelConnected()) navigate("/", { replace: true }); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length < 5) { setData(null); return; }
    debounceRef.current = setTimeout(() => analyse(), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title]);

  async function analyse() {
    setLoading(true);
    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      const context = getChannelContext(ch, vids);
      const result = await callAI(
        `Analyse this YouTube title in real time. Return JSON: {curiosity_gap (0-10), emotional_trigger (0-10), search_power (0-10), first_word_impact (0-10), specificity (0-10), pattern_break (0-10), search_vs_browse (string explaining balance), primary_emotion (string), predicted_ctr_tier (low|medium|high|viral), title_type (how-to|list|story|curiosity|controversial), top_weakness (single biggest problem), three_better_versions: [{title, explanation}]}`,
        `${context}\n\nTitle to analyse: "${title}"\n\nRecent titles: ${vids.map(v => v.title).join(", ")}`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const total = data ? METRICS.reduce((s, m) => s + ((data as any)[m.key] || 0), 0) : 0;
  const totalMax = METRICS.length * 10;

  const tierColor = (t: string) => {
    if (t === "viral") return "hsl(var(--success))";
    if (t === "high") return "hsl(var(--success))";
    if (t === "medium") return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <FeaturePage emoji="🧪" title="Title Psychology" description="Type your title — live AI analysis updates as you type.">
      <div className="flex flex-col md:flex-row gap-8 max-w-[920px] mx-auto">
        {/* Left — Input + Results */}
        <div className="flex-1 space-y-8 md:w-[60%]">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Type your video title here..." className="h-14 text-lg font-medium" />

          {data && (
            <div className="space-y-6">
              {/* Search vs Browse */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="cb-card space-y-3">
                <p className="t-label" style={{ color: "hsl(var(--info))" }}>🔍 SEARCH VS BROWSE</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{data.search_vs_browse}</p>
              </motion.div>

              {/* Emotion */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-3">
                <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>💡 PRIMARY EMOTION</p>
                <p className="text-lg font-semibold">{data.primary_emotion}</p>
              </motion.div>

              {/* Weakness */}
              {data.top_weakness && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="p-4 rounded-xl" style={{ background: "hsl(var(--destructive) / 0.08)", borderLeft: "3px solid hsl(var(--destructive))" }}>
                  <p className="t-label mb-1" style={{ color: "hsl(var(--destructive))" }}>⚠️ TOP WEAKNESS</p>
                  <p className="text-sm">{data.top_weakness}</p>
                </motion.div>
              )}

              {/* Better Versions */}
              <div className="space-y-3">
                <p className="t-label" style={{ color: "hsl(var(--success))" }}>✨ BETTER VERSIONS</p>
                {data.three_better_versions?.map((v, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + i * 0.08 }}
                    className="cb-card flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{v.title}</p>
                      <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{v.explanation}</p>
                    </div>
                    <CopyButton text={v.title} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Live Score Panel */}
        <div className="md:w-[40%] md:sticky md:top-8 self-start">
          <div className="cb-card space-y-5">
            <div className="text-center">
              <p className="t-label mb-2">TOTAL SCORE</p>
              <p className="animate-count" style={{ fontSize: 48, fontWeight: 800, color: data ? (total / totalMax >= 0.7 ? "hsl(var(--success))" : total / totalMax >= 0.4 ? "hsl(var(--warning))" : "hsl(var(--destructive))") : "hsl(var(--muted-foreground))" }}>
                {data ? total : "—"}
                <span className="text-lg" style={{ color: "hsl(var(--muted-foreground))" }}>/{totalMax}</span>
              </p>
              {data && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ background: `${tierColor(data.predicted_ctr_tier)}20`, color: tierColor(data.predicted_ctr_tier) }}>
                  {data.predicted_ctr_tier} CTR
                </span>
              )}
            </div>

            <div className="space-y-3">
              {METRICS.map(m => {
                const val = data ? (data as any)[m.key] || 0 : 0;
                return (
                  <div key={m.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{m.label}</span>
                      <span className="font-bold" style={{ color: `hsl(var(${m.color}))` }}>{val}/10</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${val * 10}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ background: `hsl(var(${m.color}))` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {loading && <p className="text-xs text-center animate-pulse" style={{ color: "hsl(var(--muted-foreground))" }}>Analysing...</p>}
          </div>
        </div>
      </div>
    </FeaturePage>
  );
}
