import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface GraveyardTopic {
  topic: string;
  times_tried: number;
  avg_performance: string;
  why_fails: string;
  should_retry: boolean;
  retry_angle: string;
}

export default function TopicGraveyard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [topics, setTopics] = useState<GraveyardTopic[]>([]);

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

      setTimeout(() => setLoadStep(2), 2000);
      const res = await callGroq(
        `Analyse this creator's videos and identify topics that consistently underperform. Return JSON array: [{topic: string, times_tried: number, avg_performance: string, why_fails: string, should_retry: boolean, retry_angle: string}]. Find 4-6 dead topics.`,
        `${context}\n\nIdentify topics that consistently underperform on this channel.`
      );

      const parsed = parseJsonFromResponse(res);
      if (Array.isArray(parsed)) setTopics(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="💀" title="Topic Graveyard" description="See which topics consistently underperform on your channel.">
        <LoadingSteps steps={["Fetching video history...", "Detecting underperforming topics...", "Building graveyard report..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="💀" title="Topic Graveyard" description="See which topics consistently underperform on your channel.">
      <div className="space-y-4">
        {topics.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`rounded-xl border p-5 ${t.should_retry ? "border-warning/20 bg-warning/5" : "border-destructive/20 bg-destructive/5"}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-lg flex items-center gap-2">
                  {t.should_retry ? "⚠️" : "💀"} {t.topic}
                </p>
                <p className="text-xs text-muted-foreground">Tried {t.times_tried} times · Avg: {t.avg_performance}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.should_retry ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                {t.should_retry ? "Worth Retrying" : "Bury It"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{t.why_fails}</p>
            {t.should_retry && (
              <div className="p-2 rounded-lg bg-background/50">
                <p className="text-xs text-success">💡 Retry angle: {t.retry_angle}</p>
              </div>
            )}
          </motion.div>
        ))}
        {topics.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No clear topic graveyard detected. Your topics are performing consistently!</p>
        )}
      </div>
    </FeaturePage>
  );
}
