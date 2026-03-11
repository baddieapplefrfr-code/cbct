import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import FeaturePage from "@/components/FeaturePage";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface HookAnalysis {
  score: number;
  killers: { phrase: string; reason: string }[];
  rewrite: string;
  changes: string[];
}

export default function HookScore() {
  const navigate = useNavigate();
  const [script, setScript] = useState("");
  const [analysis, setAnalysis] = useState<HookAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (script.trim().length < 50) { setAnalysis(null); return; }

    debounceRef.current = setTimeout(() => {
      analyzeHook();
    }, 1000);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [script]);

  async function analyzeHook() {
    setLoading(true);
    try {
      const result = await callGroq(
        "Analyse this video hook/script for YouTube retention. Return JSON with: score (0-100), killers (array of {phrase, reason} for each retention killer), rewrite (the entire hook rewritten to be 10x more compelling), changes (array of strings explaining each change made). Be specific and brutal.",
        `Analyse this YouTube hook/script:\n\n${script}`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setAnalysis(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeaturePage emoji="🎣" title="Hook Score" description="Paste your script. Get a live retention analysis with AI rewrites.">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">YOUR SCRIPT</p>
          <Textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Paste your video hook or intro script here (minimum 50 characters)..."
            className="min-h-[300px] rounded-xl"
          />
          {script.length > 0 && script.length < 50 && (
            <p className="text-xs text-muted-foreground mt-2">Type at least 50 characters to trigger analysis</p>
          )}
        </div>

        {/* Right: Analysis */}
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center gap-2 py-8">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Analysing your hook...</span>
            </div>
          )}

          {analysis && !loading && (
            <>
              {/* Score */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Hook Score</p>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative mx-auto w-28 h-28"
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                    <motion.circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={analysis.score >= 70 ? "hsl(var(--success))" : analysis.score >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${analysis.score * 2.83} ${283 - analysis.score * 2.83}`}
                      initial={{ strokeDasharray: "0 283" }}
                      animate={{ strokeDasharray: `${analysis.score * 2.83} ${283 - analysis.score * 2.83}` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black">{analysis.score}</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Killers */}
              {analysis.killers?.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-card p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Retention Killers
                  </p>
                  {analysis.killers.map((k, i) => (
                    <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <p className="text-sm font-semibold text-destructive">"{k.phrase}"</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Rewrite */}
              {analysis.rewrite && (
                <div className="rounded-xl border border-success/20 bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase text-success flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" /> AI Rewrite
                    </p>
                    <CopyButton text={analysis.rewrite} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{analysis.rewrite}</p>
                </div>
              )}

              {/* Changes */}
              {analysis.changes?.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">What Changed & Why</p>
                  {analysis.changes.map((c, i) => (
                    <p key={i} className="text-sm text-muted-foreground mb-1">• {c}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FeaturePage>
  );
}
