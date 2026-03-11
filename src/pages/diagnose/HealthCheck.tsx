import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HeartPulse, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface VitalSign {
  name: string;
  status: "healthy" | "warning" | "critical";
  score: number;
  explanation: string;
  fix: string;
}

interface HealthData {
  overall_score: number;
  vital_signs: VitalSign[];
  narrative: string;
  urgent_fix: string;
}

export default function HealthCheck() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

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

      const avgViews = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
      const avgLikes = vids.reduce((s, v) => s + v.likeCount, 0) / vids.length;
      const avgComments = vids.reduce((s, v) => s + v.commentCount, 0) / vids.length;
      const uploadDates = vids.map(v => new Date(v.publishedAt).getTime()).sort((a, b) => b - a);
      const gaps = uploadDates.slice(0, -1).map((d, i) => (d - uploadDates[i + 1]) / 86400000);
      const avgGap = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 30;

      setLoadStep(2);
      const result = await callGroq(
        `You are a YouTube channel health diagnostician. Analyse these 8 vital signs and return JSON: {overall_score: number 0-100, vital_signs: [{name: string, status: "healthy"|"warning"|"critical", score: number 0-100, explanation: string (max 12 words), fix: string (max 10 words)}], narrative: string (2 sentences max), urgent_fix: string}. The 8 vital signs: Upload Consistency, Audience Engagement, Title Strength, Thumbnail Performance, Topic Diversity, Growth Velocity, Content Quality Signal, Algorithm Relationship. Be specific and concise.`,
        `${context}\n\nAvg views: ${Math.round(avgViews)}\nAvg likes: ${Math.round(avgLikes)}\nAvg comments: ${Math.round(avgComments)}\nAvg days between uploads: ${Math.round(avgGap)}\nSubscribers: ${ch.subscriberCount}\n\nAnalyse all 8 vital signs.`
      );

      const parsed = parseJsonFromResponse(result);
      if (parsed) setHealth(parsed);
    } catch (err: any) {
      setError(err.message || "Failed to load health data");
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (s: string) => {
    if (s === "healthy") return <CheckCircle className="h-5 w-5 text-success" />;
    if (s === "warning") return <AlertCircle className="h-5 w-5 text-warning" />;
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  const scoreColor = (s: number) => {
    if (s >= 70) return "score-good";
    if (s >= 40) return "score-warn";
    return "score-bad";
  };

  const scoreStyle = (s: number) => {
    if (s >= 70) return { color: "hsl(var(--success))" };
    if (s >= 40) return { color: "hsl(var(--warning))" };
    return { color: "hsl(var(--destructive))" };
  };

  if (loading) {
    return (
      <FeaturePage emoji="🏥" title="Health Scanner" description="Something feels wrong with your channel but you can't figure out what.">
        <LoadingSteps steps={["Fetching your channel data...", "Analysing 8 vital signs...", "Building health report..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  if (error) {
    return (
      <FeaturePage emoji="🏥" title="Health Scanner" description="Something feels wrong with your channel but you can't figure out what.">
        <div className="text-center py-16"><p className="text-destructive">{error}</p></div>
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🏥" title="Health Scanner" description="Something feels wrong with your channel but you can't figure out what.">
      {health && (
        <div className="space-y-6">
          {/* Overall Score Ring */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6">
            <div className="relative h-36 w-36">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none"
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${health.overall_score * 3.27} 327`}
                  style={scoreStyle(health.overall_score)}
                  initial={{ strokeDasharray: "0 327" }}
                  animate={{ strokeDasharray: `${health.overall_score * 3.27} 327` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="data-number-xl" style={scoreStyle(health.overall_score)}>{health.overall_score}</span>
              </div>
            </div>
            <p className="t-section mt-3">OVERALL CHANNEL HEALTH</p>
          </motion.div>

          {/* Vital Signs — compact */}
          <div className="grid md:grid-cols-2 gap-3">
            {health.vital_signs?.map((vs, i) => (
              <motion.div
                key={vs.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="cb-card flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(vs.status)}
                    <span className="t-card-title truncate">{vs.name}</span>
                  </div>
                  <p className="t-body text-xs truncate">{vs.explanation}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="data-number-xl" style={scoreStyle(vs.score)}>{vs.score}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Urgent Fix */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="cb-card-glow p-6">
            <p className="t-section text-destructive mb-2">🚨 MOST URGENT FIX</p>
            <p className="text-sm font-medium leading-relaxed">{health.urgent_fix}</p>
            <CopyButton text={health.urgent_fix} className="mt-3" />
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
