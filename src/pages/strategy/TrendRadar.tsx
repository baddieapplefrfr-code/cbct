import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Radio, ArrowRight, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

export interface TrendItem {
  title: string;
  momentum_score: number;
  days_left: number;
  suggested_angle: string;
  urgency: string; // "post today" | "post this week" | "post this month" | "dying"
  type: string; // "exploding" | "dying" | "evergreen" | "crossover"
}

// Exported for dashboard widget usage
export async function fetchTrends(): Promise<{ trends: TrendItem[]; lastUpdated: Date }> {
  const ch = await getMyChannel();
  const vids = await getRecentVideos(ch.id, 10);
  const context = getChannelContext(ch, vids);

  const nicheResult = await callGroq(
    "Given these video titles, identify the creator's primary niche in 2-3 words. Just output the niche, nothing else.",
    context
  );

  const result = await callGroq(
    `You are a YouTube trend analyst. Based on this creator's niche of "${nicheResult.trim()}", generate a live trend intelligence report for right now in March 2026. Include: 5 topics currently exploding in this niche with momentum scores, 3 topics that peaked last week and are now dying (avoid these), 2 evergreen formats that always work in this niche, 1 completely unexpected crossover topic from another niche that could go viral. For each item return JSON with: title, momentum_score (1-100), days_left (in viral window, 0 for dying), suggested_angle (for this creator), urgency ("post today"/"post this week"/"post this month"/"dying"), type ("exploding"/"dying"/"evergreen"/"crossover"). Return JSON array.`,
    context
  );

  const parsed = parseJsonFromResponse(result);
  return {
    trends: Array.isArray(parsed) ? parsed : [],
    lastUpdated: new Date(),
  };
}

export function TrendCard({ trend, compact = false, onBuild }: { trend: TrendItem; compact?: boolean; onBuild?: () => void }) {
  const urgencyConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    "post today": { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive", label: "🔴 POST TODAY" },
    "post this week": { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning", label: "🟡 THIS WEEK" },
    "post this month": { bg: "bg-success/10", border: "border-success/20", text: "text-success", label: "🟢 THIS MONTH" },
    "dying": { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", label: "💀 DYING" },
  };

  const config = urgencyConfig[trend.urgency?.toLowerCase()] || urgencyConfig["post this month"];

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg}`}>
        <span className={`text-xs font-bold shrink-0 ${config.text}`}>{config.label}</span>
        <p className="text-sm font-medium truncate flex-1">{trend.title}</p>
        <span className="text-xs font-bold text-primary">{trend.momentum_score}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${config.border} bg-card p-5 card-glow`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>{config.label}</span>
            {trend.type === "crossover" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">✨ CROSSOVER</span>}
            {trend.type === "evergreen" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">♻️ EVERGREEN</span>}
          </div>
          <p className="font-semibold text-lg">{trend.title}</p>
        </div>
        {trend.days_left > 0 && (
          <div className="text-center px-3">
            <p className={`text-2xl font-black ${config.text}`}>{trend.days_left}</p>
            <p className="text-xs text-muted-foreground">days left</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-muted-foreground">Momentum</span>
        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${trend.momentum_score}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${trend.urgency?.toLowerCase() === "dying" ? "bg-muted-foreground" : "bg-primary"}`}
          />
        </div>
        <span className="text-sm font-bold">{trend.momentum_score}</span>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{trend.suggested_angle}</p>

      {trend.urgency?.toLowerCase() !== "dying" && onBuild && (
        <Button size="sm" onClick={onBuild}>
          Ride This Trend <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      )}
      {trend.urgency?.toLowerCase() === "dying" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Avoid this topic — momentum is fading
        </div>
      )}
    </div>
  );
}

export default function TrendRadar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadTrends();
    refreshRef.current = setInterval(loadTrends, 30 * 60 * 1000); // 30 min
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, []);

  async function loadTrends() {
    try {
      setLoadStep(0);
      setTimeout(() => setLoadStep(1), 1500);
      setTimeout(() => setLoadStep(2), 3000);
      const data = await fetchTrends();
      setTrends(data.trends);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Sort: dying last, then by urgency
  const urgencyOrder: Record<string, number> = { "post today": 0, "post this week": 1, "post this month": 2, "dying": 3 };
  const sorted = [...trends].sort((a, b) => (urgencyOrder[a.urgency?.toLowerCase()] ?? 2) - (urgencyOrder[b.urgency?.toLowerCase()] ?? 2));

  if (loading) {
    return (
      <FeaturePage emoji="📡" title="Trend Radar" description="Live trend intelligence for your niche">
        <LoadingSteps steps={["Detecting your niche...", "Scanning trending topics...", "Building intelligence report..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="📡" title="Trend Radar" description="Live trend intelligence for your niche">
      {/* Live indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-2.5 w-2.5 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Live Intelligence Feed</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {Math.round((Date.now() - lastUpdated.getTime()) / 60000)}m ago
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadTrends}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Radar pulse */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <motion.div animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 rounded-full bg-primary/20" />
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }} className="absolute inset-0 rounded-full bg-primary/15" />
          <div className="relative h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Radio className="h-7 w-7 text-primary" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((trend, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <TrendCard
              trend={trend}
              onBuild={() => navigate(`/create/video-machine?topic=${encodeURIComponent(trend.title)}`)}
            />
          </motion.div>
        ))}
      </div>
    </FeaturePage>
  );
}
