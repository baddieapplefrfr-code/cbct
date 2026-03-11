import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Skull, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface ValidationResult {
  verdict: "GO" | "RISKY" | "GRAVEYARD";
  verdict_reason: string;
  evidence: string;
  improvements: string[];
  best_title: string;
  estimated_views: string;
  confidence: number;
}

export default function IdeaValidator() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function validate() {
    if (!idea.trim()) return;
    setLoading(true);
    setResult(null);
    setLoadStep(0);

    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 15);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);

      setTimeout(() => setLoadStep(2), 2000);

      const res = await callGroq(
        `You are a YouTube content validator. Analyse this idea against: search demand, competition, audience fit, trend trajectory, view ceiling. Give a clear verdict: GO, RISKY, or GRAVEYARD. Format as JSON: {verdict: "GO"|"RISKY"|"GRAVEYARD", verdict_reason: string, evidence: string, improvements: [string, string, string], best_title: string, estimated_views: string, confidence: number 0-100}`,
        `${context}\n\nVIDEO IDEA: "${idea}"\n\nValidate this idea.`
      );

      const parsed = parseJsonFromResponse(res);
      if (parsed) setResult(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const verdictConfig = {
    GO: { color: "text-success", bg: "bg-success/10 border-success/20", icon: CheckCircle, emoji: "🟢" },
    RISKY: { color: "text-warning", bg: "bg-warning/10 border-warning/20", icon: AlertTriangle, emoji: "🟡" },
    GRAVEYARD: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: Skull, emoji: "💀" },
  };

  return (
    <FeaturePage emoji="✅" title="Idea Validator" description="I film for 8 hours then realise nobody wanted to watch this topic.">
      <div className="max-w-xl mx-auto space-y-4 mb-8">
        <Textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="Describe your video idea..."
          className="min-h-[100px] rounded-xl text-lg"
        />
        <Button size="lg" className="w-full h-14 rounded-xl text-lg font-bold" onClick={validate} disabled={loading || !idea.trim()}>
          <CheckCircle className="mr-2 h-5 w-5" /> Validate My Idea
        </Button>
      </div>

      {loading && (
        <LoadingSteps steps={["Fetching your channel data...", "Analysing market demand...", "Rendering verdict..."]} currentStep={loadStep} />
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            {/* Verdict */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`rounded-xl border p-8 text-center ${verdictConfig[result.verdict]?.bg}`}
            >
              <p className="text-6xl mb-4">{verdictConfig[result.verdict]?.emoji}</p>
              <p className={`text-4xl font-black ${verdictConfig[result.verdict]?.color}`}>{result.verdict}</p>
              <p className="text-lg mt-3">{result.verdict_reason}</p>
              <p className="text-sm text-muted-foreground mt-2">{result.evidence}</p>
              <p className="text-xs text-muted-foreground mt-3">Confidence: {result.confidence}%</p>
            </motion.div>

            {/* Improvements */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> How to Improve This Idea</h3>
              {result.improvements?.map((imp, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm">{imp}</p>
                </motion.div>
              ))}
            </div>

            {/* Best Title */}
            <div className="rounded-xl border border-primary/20 bg-card p-5">
              <p className="text-xs font-semibold uppercase text-primary mb-2">Best Title If You Make This</p>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">{result.best_title}</p>
                <CopyButton text={result.best_title} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Estimated views: {result.estimated_views}</p>
            </div>

            {result.verdict === "GO" && (
              <Button size="lg" className="w-full h-12 rounded-xl" onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(result.best_title)}`)}>
                Make This Video <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </FeaturePage>
  );
}
