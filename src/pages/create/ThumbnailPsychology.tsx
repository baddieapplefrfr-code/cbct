import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Zap, ChevronDown } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface Improvement { priority: number; change: string; reason: string; impact: string }
interface RedesignConcept { name: string; background: string; focal_element: string; text_overlay: string; emotion: string; predicted_ctr: number; why_it_works: string }
interface ThumbnailData {
  ctr_prediction: number;
  overall_verdict: string;
  eye_flow: string[];
  five_second_test: string;
  emotion_triggered: string;
  emotion_needed: string;
  contrast_score: number;
  text_readability: number;
  improvements: Improvement[];
  redesign_concepts: RedesignConcept[];
}

const scoreStyle = (s: number, max = 10) => {
  const pct = (s / max) * 100;
  if (pct >= 70) return { color: "hsl(var(--success))" };
  if (pct >= 40) return { color: "hsl(var(--warning))" };
  return { color: "hsl(var(--destructive))" };
};

export default function ThumbnailPsychology() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<ThumbnailData | null>(null);
  const [showRedesigns, setShowRedesigns] = useState(false);

  useEffect(() => { if (!isChannelConnected()) navigate("/", { replace: true }); }, []);

  async function analyse() {
    if (!description.trim()) return;
    setLoading(true); setData(null);
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 5);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);
      const result = await callAI(
        `Analyse this YouTube thumbnail description. Return JSON: {ctr_prediction (0-10), overall_verdict (string), eye_flow: [string] (3 focal points), five_second_test (what viewer sees in 5 sec), emotion_triggered (string), emotion_needed (string), contrast_score (0-10), text_readability (0-10), improvements: [{priority, change, reason, impact}], redesign_concepts: [{name, background, focal_element, text_overlay, emotion, predicted_ctr (0-10), why_it_works}]}`,
        `${context}\n\nThumbnail description: ${description}\n\nAnalyse psychology and visual impact.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <FeaturePage emoji="🧠" title="Thumbnail Psychology Lab" description="Describe your thumbnail. We simulate how 1000 viewers see it in the first 5 seconds.">
      <div className="space-y-4 mb-12">
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your thumbnail: e.g., 'Split screen — left side me looking shocked at laptop, right side showing income dashboard with $47K highlighted in green, text overlay says I QUIT MY JOB'" rows={4} />
        <Button onClick={analyse} disabled={loading || !description.trim()} variant="hero" className="w-full h-12"><Eye className="h-5 w-5 mr-2" /> Analyse Thumbnail</Button>
      </div>

      {loading && <LoadingSteps steps={["Processing thumbnail concept...", "Simulating viewer eye-tracking...", "Generating psychology report..."]} currentStep={loadStep} />}

      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">CTR PREDICTION</p>
            <p className="animate-count" style={{ fontSize: 64, fontWeight: 800, ...scoreStyle(data.ctr_prediction) }}>{data.ctr_prediction}<span className="text-2xl" style={{ color: "hsl(var(--muted-foreground))" }}>/10</span></p>
            <p className="text-lg mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>{data.overall_verdict}</p>
            <div className="flex justify-center gap-4 mt-6">
              {[{ label: "Contrast", val: data.contrast_score }, { label: "Readability", val: data.text_readability }].map(m => (
                <span key={m.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--secondary))", ...scoreStyle(m.val) }}>
                  {m.label}: {m.val}/10
                </span>
              ))}
            </div>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Eye Flow */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>👁 EYE FLOW PATH</p>
              <div className="space-y-3">
                {data.eye_flow?.map((point, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `hsl(var(--info) / ${0.3 - i * 0.08})`, color: "hsl(var(--info))" }}>{i + 1}</span>
                    <span className="text-sm">{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 5 Second Test */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--warning))" }}>⏱ 5 SECOND TEST</p>
              <p className="text-sm font-medium leading-relaxed">{data.five_second_test}</p>
            </motion.div>

            {/* Emotion */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>💡 EMOTION ANALYSIS</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 rounded-lg text-center" style={{ background: "hsl(var(--secondary))" }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Triggered</p>
                  <p className="text-sm font-semibold">{data.emotion_triggered}</p>
                </div>
                <Zap className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
                <div className="flex-1 p-3 rounded-lg text-center" style={{ background: "hsl(var(--success) / 0.08)" }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "hsl(var(--success))" }}>Needed</p>
                  <p className="text-sm font-semibold">{data.emotion_needed}</p>
                </div>
              </div>
              {data.emotion_triggered !== data.emotion_needed && (
                <p className="text-xs p-2 rounded" style={{ background: "hsl(var(--warning) / 0.08)", color: "hsl(var(--warning))" }}>⚠️ Emotion mismatch — your thumbnail triggers the wrong feeling</p>
              )}
            </motion.div>

            {/* Top Improvements */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--primary))" }}>🎯 TOP IMPROVEMENTS</p>
              {data.improvements?.slice(0, 3).map((imp, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>{imp.priority}</span>
                  <div>
                    <p className="text-sm font-medium">{imp.change}</p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{imp.reason}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Layer 3 — Redesign Concepts */}
          <div>
            <button onClick={() => setShowRedesigns(!showRedesigns)} className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: "hsl(var(--primary))" }}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showRedesigns ? "rotate-180" : ""}`} />
              {showRedesigns ? "Hide" : "Show"} 3 Redesign Concepts
            </button>
            {showRedesigns && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="grid md:grid-cols-3 gap-4">
                {data.redesign_concepts?.map((c, i) => (
                  <div key={i} className="cb-card space-y-3">
                    <div className="h-24 rounded-lg flex items-center justify-center text-xs" style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
                      <div className="text-center p-3">
                        <p className="font-bold text-sm">{c.text_overlay || c.name}</p>
                        <p className="text-[10px] mt-1">{c.focal_element}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{c.why_it_works}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={scoreStyle(c.predicted_ctr)}>CTR: {c.predicted_ctr}/10</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>{c.emotion}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
