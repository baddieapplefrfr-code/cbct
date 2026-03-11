import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface DropData {
  videos: { title: string; views: number; likes: number; comments: number; engagement_rate: string; expected_engagement: string; drop_severity: string; diagnosis: string }[];
  overall_trend: string;
  fix: string;
}

export default function EngagementDrop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<DropData | null>(null);

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
        "Find videos where engagement (likes + comments) dropped significantly compared to views. These signal audience disconnect. Return JSON: {videos: [{title, views, likes, comments, engagement_rate, expected_engagement, drop_severity: 'mild'|'severe'|'critical', diagnosis}], overall_trend: string, fix: string}. Only include videos with notable drops, max 6.",
        `${context}\n\nDetect engagement drops.`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const severityColor: Record<string, string> = {
    mild: "border-warning/20 bg-warning/5",
    severe: "border-destructive/20 bg-destructive/5",
    critical: "border-destructive/40 bg-destructive/10",
  };

  if (loading) return (
    <FeaturePage emoji="📉" title="Engagement Drop Detector" description="Find videos where your audience disconnected">
      <LoadingSteps steps={["Loading videos...", "Analysing engagement patterns...", "Detecting drops..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="📉" title="Engagement Drop Detector" description="Find videos where your audience disconnected">
      {data && (
        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">Overall Trend</p>
            <p className="font-medium">{data.overall_trend}</p>
          </div>

          <div className="space-y-4">
            {data.videos?.map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-xl border p-5 ${severityColor[v.drop_severity] || severityColor.mild}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCount(v.views)} views · {formatCount(v.likes)} likes · {formatCount(v.comments)} comments</p>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                    v.drop_severity === "critical" ? "bg-destructive/20 text-destructive" :
                    v.drop_severity === "severe" ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>{v.drop_severity}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div><p className="text-xs text-muted-foreground">Actual</p><p className="data-number text-xl">{v.engagement_rate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Expected</p><p className="text-xl font-bold text-muted-foreground">{v.expected_engagement}</p></div>
                </div>
                <p className="text-sm text-muted-foreground"><AlertTriangle className="inline h-3 w-3 mr-1" />{v.diagnosis}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/10 p-6 text-center">
            <p className="text-xs font-semibold uppercase text-primary mb-2">🔧 How to Fix</p>
            <p className="text-lg font-medium">{data.fix}</p>
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
