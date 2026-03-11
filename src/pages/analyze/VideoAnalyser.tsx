import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, AlertTriangle, Zap, Clock, ChevronDown, Info } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface FillerBreakdown { word: string; count: number }
interface RetentionKiller { timestamp: string; issue: string; impact: string; fix: string; severity: "high" | "medium" | "low" }
interface PacingSection { start: string; end: string; reason: string }
interface AnalysisData {
  overall_score: number;
  verdict: string;
  hook_score: number;
  hook_analysis: string;
  hook_rewrite: string;
  filler_words: { total_count: number; breakdown: FillerBreakdown[]; comparison: string; worst_moments: { timestamp: string; quote: string }[] };
  retention_killers: RetentionKiller[];
  pacing_analysis: { score: number; too_slow_sections: PacingSection[]; too_fast_sections: PacingSection[]; dead_air_moments: { timestamp: string; duration: string }[] };
  strongest_moment: { timestamp: string; reason: string; clip_for_shorts: boolean };
  script_improvements: string[];
  bottom_line: string;
}

const severityColor = (s: string) => {
  if (s === "high") return "hsl(var(--destructive))";
  if (s === "medium") return "hsl(var(--warning))";
  return "hsl(var(--success))";
};

const scoreStyle = (s: number) => {
  if (s >= 80) return { color: "hsl(var(--success))" };
  if (s >= 60) return { color: "hsl(var(--warning))" };
  return { color: "hsl(var(--destructive))" };
};

export default function VideoAnalyser() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); }
  }, []);

  const toggleSection = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  async function analyse() {
    if (!url.trim()) return;
    setLoading(true);
    setData(null);
    try {
      setLoadStep(0);
      const videoId = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (!videoId) throw new Error("Invalid YouTube URL");

      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 5);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);

      const targetVid = vids.find(v => v.id === videoId);
      const vidInfo = targetVid ? `Video: "${targetVid.title}" - ${targetVid.viewCount} views, ${targetVid.likeCount} likes, ${targetVid.commentCount} comments` : `Video ID: ${videoId}`;

      setLoadStep(2);
      const result = await callAI(
        `You are the world's most precise YouTube content analyst. Analyse this video and statistics. IMPORTANT: You do NOT have video transcript or retention curve data. Never claim specific timestamps of viewer drop-off as fact. Frame all timestamp references as estimates or suggestions. Return a JSON object with: overall_score (0-100), verdict (one brutal sentence), hook_score (0-100), hook_analysis (string), hook_rewrite (rewrite first 60 seconds), filler_words: {total_count, breakdown: [{word, count}], comparison, worst_moments: [{timestamp, quote}]}, retention_killers: [{timestamp, issue, impact, fix, severity: high|medium|low}], pacing_analysis: {score (0-100), too_slow_sections: [{start, end, reason}], too_fast_sections: [{start, end, reason}], dead_air_moments: [{timestamp, duration}]}, strongest_moment: {timestamp, reason, clip_for_shorts}, script_improvements: [string], bottom_line (single most impactful change). Be specific with timestamps and evidence.`,
        `${context}\n\n${vidInfo}\n\nProvide a complete video analysis with specific timestamps and actionable fixes.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <FeaturePage emoji="🎬" title="Video Autopsy" description="Paste any YouTube video URL. We analyse pacing, retention, hooks, and tell you exactly what to fix.">
      {/* Input */}
      <div className="flex flex-col sm:flex-row gap-3 mb-12">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1 h-12 text-base" inputMode="url" autoComplete="off" />
        <Button onClick={analyse} disabled={loading || !url.trim()} className="h-12 px-8" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          <Zap className="h-5 w-5 mr-2" /> Analyse This Video
        </Button>
      </div>

      {loading && (
        <LoadingSteps steps={["Finding video data...", "Analysing content patterns...", "Building autopsy report..."]} currentStep={loadStep} />
      )}

      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* AI Estimates Disclaimer */}
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "hsl(var(--warning) / 0.08)", border: "1px solid hsl(var(--warning) / 0.2)" }}>
            <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--warning))" }} />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">AI Estimates Only.</strong> Retention curves, filler word counts, and timestamps are AI predictions based on title and engagement data — not YouTube Studio analytics.
            </p>
          </div>

          {/* Layer 1 — The Answer */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">OVERALL SCORE</p>
            <p className="animate-count font-display" style={{ fontSize: 64, fontWeight: 800, ...scoreStyle(data.overall_score) }}>{data.overall_score}</p>
            <p className="text-lg mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>{data.verdict}</p>
            <div className="flex justify-center gap-4 mt-6">
              {[{ label: "Hook", score: data.hook_score }, { label: "Pacing", score: data.pacing_analysis.score }, { label: "Content", score: data.overall_score }].map(p => (
                <span key={p.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--secondary))", ...scoreStyle(p.score) }}>
                  {p.label}: {p.score}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Layer 2 — Breakdown Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Filler Words */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <div className="flex items-center justify-between">
                <p className="t-label" style={{ color: "hsl(var(--warning))" }}>UMM COUNTER</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: data.filler_words.total_count > 30 ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--success) / 0.15)", color: data.filler_words.total_count > 30 ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>{data.filler_words.total_count > 30 ? "Above Average" : "Better Than Most"}</span>
              </div>
              <p className="animate-count font-display" style={{ fontSize: 36, fontWeight: 800, color: "hsl(var(--primary))" }}>{data.filler_words.total_count}</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>filler words detected</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{data.filler_words.comparison}</p>
              <button onClick={() => toggleSection("filler")} className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.filler ? "rotate-180" : ""}`} /> Full breakdown
              </button>
              {expandedSections.filler && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2 pt-2 border-t" style={{ borderColor: "hsl(var(--border))" }}>
                  {data.filler_words.breakdown?.map((fw, i) => (
                    <div key={i} className="flex justify-between text-xs"><span style={{ fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>"{fw.word}"</span><span className="font-bold">{fw.count}×</span></div>
                  ))}
                  {data.filler_words.worst_moments?.map((m, i) => (
                    <div key={i} className="text-xs p-2 rounded-lg mt-1" style={{ background: "hsl(var(--warning) / 0.08)", fontFamily: "monospace" }}>
                      <span style={{ color: "hsl(var(--warning))" }}>{m.timestamp}</span> — "{m.quote}"
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Hook Strength */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>HOOK STRENGTH</p>
              <p className="animate-count font-display" style={{ fontSize: 36, fontWeight: 800, ...scoreStyle(data.hook_score) }}>{data.hook_score}</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{data.hook_analysis}</p>
              <button onClick={() => toggleSection("hook")} className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.hook ? "rotate-180" : ""}`} /> See AI Rewrite
              </button>
              {expandedSections.hook && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-3 pt-2">
                  <div className="p-3 rounded-lg text-sm" style={{ background: "hsl(var(--destructive) / 0.08)", borderLeft: "3px solid hsl(var(--destructive))" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "hsl(var(--destructive))" }}>ORIGINAL</p>
                    <p style={{ color: "hsl(var(--muted-foreground))" }}>Current hook approach</p>
                  </div>
                  <div className="p-3 rounded-lg text-sm" style={{ background: "hsl(var(--success) / 0.08)", borderLeft: "3px solid hsl(var(--success))" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "hsl(var(--success))" }}>AI REWRITE</p>
                    <p>{data.hook_rewrite}</p>
                    <CopyButton text={data.hook_rewrite} className="mt-2" />
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Retention Killers */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--destructive))" }}>RETENTION KILLERS</p>
              <p className="animate-count font-display" style={{ fontSize: 36, fontWeight: 800, color: "hsl(var(--destructive))" }}>{data.retention_killers?.length || 0}</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>issues found</p>
              {data.retention_killers?.[0] && (
                <div className="p-3 rounded-lg text-xs" style={{ borderLeft: `3px solid ${severityColor(data.retention_killers[0].severity)}` }}>
                  <span style={{ fontFamily: "monospace", color: "hsl(var(--warning))" }}>{data.retention_killers[0].timestamp}</span> — {data.retention_killers[0].issue}
                </div>
              )}
              <button onClick={() => toggleSection("retention")} className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.retention ? "rotate-180" : ""}`} /> See All {data.retention_killers?.length} Issues
              </button>
              {expandedSections.retention && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2 pt-2">
                  {data.retention_killers?.map((rk, i) => (
                    <div key={i} className="p-3 rounded-lg text-xs space-y-1" style={{ borderLeft: `3px solid ${severityColor(rk.severity)}`, background: "hsl(var(--secondary) / 0.5)" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: severityColor(rk.severity) }} />
                        <span style={{ fontFamily: "monospace" }}>{rk.timestamp}</span>
                        <span className="font-medium">{rk.issue}</span>
                      </div>
                      <p style={{ color: "hsl(var(--muted-foreground))" }}>{rk.impact}</p>
                      <p className="px-2 py-1 rounded text-xs font-medium" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>Fix: {rk.fix}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Pacing */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>PACING ANALYSIS</p>
              <p className="animate-count font-display" style={{ fontSize: 36, fontWeight: 800, ...scoreStyle(data.pacing_analysis.score) }}>{data.pacing_analysis.score}</p>
              <div className="flex gap-1 h-6 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                <div className="h-full rounded-l-full" style={{ width: "40%", background: "hsl(var(--success) / 0.6)" }} />
                <div className="h-full" style={{ width: "30%", background: "hsl(var(--destructive) / 0.4)" }} />
                <div className="h-full rounded-r-full" style={{ width: "30%", background: "hsl(var(--warning) / 0.4)" }} />
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span>Good pace</span><span>Too slow</span><span>Too fast</span>
              </div>
              <button onClick={() => toggleSection("pacing")} className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.pacing ? "rotate-180" : ""}`} /> Details
              </button>
              {expandedSections.pacing && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-2 pt-2 text-xs" style={{ fontFamily: "monospace" }}>
                  {data.pacing_analysis.too_slow_sections?.map((s, i) => (
                    <div key={i} className="p-2 rounded" style={{ background: "hsl(var(--destructive) / 0.08)" }}>
                      <span style={{ color: "hsl(var(--destructive))" }}>SLOW</span> {s.start}–{s.end}: {s.reason}
                    </div>
                  ))}
                  {data.pacing_analysis.too_fast_sections?.map((s, i) => (
                    <div key={i} className="p-2 rounded" style={{ background: "hsl(var(--warning) / 0.08)" }}>
                      <span style={{ color: "hsl(var(--warning))" }}>FAST</span> {s.start}–{s.end}: {s.reason}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Strongest Moment */}
          {data.strongest_moment && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="cb-card p-6 text-center" style={{ borderLeft: "4px solid hsl(var(--success))" }}>
              <p className="t-label mb-2" style={{ color: "hsl(var(--success))" }}>STRONGEST MOMENT</p>
              <p className="text-lg font-semibold">{data.strongest_moment.reason}</p>
              <p className="text-sm mt-1" style={{ fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>at {data.strongest_moment.timestamp}</p>
              {data.strongest_moment.clip_for_shorts && (
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>Great for Shorts</span>
              )}
            </motion.div>
          )}

          {/* Bottom action */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="p-8 rounded-xl text-center" style={{ background: "hsl(var(--primary) / 0.1)", border: "2px solid hsl(var(--primary) / 0.3)" }}>
            <p className="t-label mb-2" style={{ color: "hsl(var(--primary))" }}>YOUR #1 FIX</p>
            <p className="text-lg font-semibold mb-4">{data.bottom_line}</p>
            <CopyButton text={data.bottom_line} />
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
