import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skull, TrendingDown, AlertTriangle } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface TitleGraveyardData {
  worst_patterns: { pattern: string; avg_views: number; example: string; why_it_fails: string }[];
  best_patterns: { pattern: string; avg_views: number; example: string }[];
  never_again: string[];
}

export default function TitleGraveyard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<TitleGraveyardData | null>(null);

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
        "Analyse this creator's video titles and their performance. Identify the worst-performing title formats/patterns and the best-performing ones. Return JSON: {worst_patterns: [{pattern, avg_views, example, why_it_fails}], best_patterns: [{pattern, avg_views, example}], never_again: [array of 5 specific title formats to never use again]}",
        `${context}\n\nAnalyse title patterns vs performance.`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <FeaturePage emoji="🪦" title="Title Graveyard" description="Your worst-performing title formats — never repeat them">
      <LoadingSteps steps={["Loading videos...", "Analysing title patterns...", "Building graveyard..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="🪦" title="Title Graveyard" description="Your worst-performing title formats — never repeat them">
      {data && (
        <div className="space-y-8">
          {/* Never Again */}
          <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-6">
            <h2 className="section-header text-destructive flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5" /> Never Use These Again</h2>
            <div className="flex flex-wrap gap-2">
              {data.never_again?.map((t, i) => (
                <span key={i} className="text-sm px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">{t}</span>
              ))}
            </div>
          </div>

          {/* Worst Patterns */}
          <div>
            <h2 className="section-header flex items-center gap-2 mb-4"><Skull className="h-5 w-5 text-destructive" /> Worst Patterns</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {data.worst_patterns?.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-destructive/20 bg-card p-5">
                  <p className="font-bold mb-1">{p.pattern}</p>
                  <p className="data-number text-destructive text-2xl mb-1">{formatCount(p.avg_views)} avg</p>
                  <p className="text-xs text-muted-foreground mb-2">Example: "{p.example}"</p>
                  <p className="text-xs text-destructive">{p.why_it_fails}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Best Patterns */}
          <div>
            <h2 className="section-header flex items-center gap-2 mb-4"><TrendingDown className="h-5 w-5 text-success" /> What Actually Works</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {data.best_patterns?.map((p, i) => (
                <div key={i} className="rounded-xl border border-success/20 bg-card p-5">
                  <p className="font-bold mb-1">{p.pattern}</p>
                  <p className="data-number text-success text-2xl mb-1">{formatCount(p.avg_views)} avg</p>
                  <p className="text-xs text-muted-foreground">Example: "{p.example}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
