import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ListOrdered, Sparkles } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface SeriesData {
  series: {
    series_name: string;
    based_on: string;
    episodes: { number: number; title: string; hook: string }[];
    why_it_works: string;
  }[];
}

export default function SeriesPlanner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<SeriesData | null>(null);

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
        "Analyse this creator's best-performing topics. Identify 3 topics that could become a video series. For each series, plan 5 episodes with titles and hooks. Return JSON: {series: [{series_name, based_on (which video inspired this), episodes: [{number, title, hook}], why_it_works}]}",
        `${context}\n\nPlan 3 series from their best topics.`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <FeaturePage emoji="📺" title="Series Planner" description="Turn your best topics into binge-worthy series">
      <LoadingSteps steps={["Analysing your top topics...", "Identifying series potential...", "Planning episodes..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="📺" title="Series Planner" description="Turn your best topics into binge-worthy series">
      {data && (
        <div className="space-y-8">
          {data.series?.map((s, si) => (
            <motion.div key={si} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.15 }}
              className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-header flex items-center gap-2"><ListOrdered className="h-5 w-5 text-cat-strategy" /> {s.series_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Based on: "{s.based_on}"</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="p-5 space-y-3">
                {s.episodes?.map((ep, i) => (
                  <div key={i} className="flex gap-3 items-start rounded-lg border border-border bg-background p-4 hover:border-primary/20 transition-colors">
                    <span className="data-number text-xl w-8 text-center shrink-0">#{ep.number}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{ep.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">Hook: {ep.hook}</p>
                    </div>
                    <CopyButton text={ep.title} className="shrink-0" />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border bg-primary/5">
                <p className="text-sm text-muted-foreground"><Sparkles className="inline h-3 w-3 mr-1 text-primary" />{s.why_it_works}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </FeaturePage>
  );
}
