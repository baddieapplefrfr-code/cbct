import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, ArrowRight, Radio } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface ViralTopic {
  topic: string;
  momentum_score: number;
  days_left: number;
  why_it_fits: string;
  suggested_title: string;
  suggested_hook: string;
}

export default function ViralWindow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [topics, setTopics] = useState<ViralTopic[]>([]);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      setLoadStep(1);

      const context = getChannelContext(ch, vids);
      setLoadStep(2);

      const result = await callGroq(
        "Based on this creator's niche and recent video topics, identify 5 trending topics right now that they should post about. For each topic: current momentum score 1-100, predicted days left in the viral window, why it fits this creator's channel, suggested title and hook. Return JSON array with fields: topic, momentum_score, days_left, why_it_fits, suggested_title, suggested_hook.",
        `${context}\n\nIdentify 5 trending topics this creator should cover NOW before the window closes.`
      );

      const parsed = parseJsonFromResponse(result);
      if (Array.isArray(parsed)) {
        setTopics(parsed.sort((a: any, b: any) => a.days_left - b.days_left));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const urgencyColor = (days: number) => {
    if (days <= 2) return { text: "text-destructive", bg: "bg-destructive", border: "border-destructive/20" };
    if (days <= 5) return { text: "text-warning", bg: "bg-warning", border: "border-warning/20" };
    return { text: "text-success", bg: "bg-success", border: "border-success/20" };
  };

  if (loading) {
    return (
      <FeaturePage emoji="📡" title="Opportunity Radar" description="Catch rising topics before your competitors do">
        <LoadingSteps steps={["Analysing your niche...", "Scanning trending topics...", "Matching opportunities..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="📡" title="Opportunity Radar" description="Catch rising topics before your competitors do">
      {/* Radar pulse effect */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-primary/20" />
          <div className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Radio className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {topics.map((topic, i) => {
          const urgency = urgencyColor(topic.days_left);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className={`rounded-xl border ${urgency.border} bg-card p-6 card-glow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-lg">{topic.topic}</p>
                  <p className="text-sm text-muted-foreground mt-1">{topic.why_it_fits}</p>
                </div>
                <div className={`text-center px-4 py-2 rounded-lg ${urgency.bg}/10 ${urgency.text}`}>
                  <p className="text-2xl font-black">{topic.days_left}</p>
                  <p className="text-xs font-semibold">days left</p>
                </div>
              </div>

              {/* Momentum bar */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground">Momentum</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.momentum_score}%` }}
                    transition={{ duration: 0.8, delay: i * 0.12 + 0.3 }}
                    className={`h-full rounded-full ${urgency.bg}`}
                  />
                </div>
                <span className="text-sm font-bold">{topic.momentum_score}</span>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-3">
                <p className="text-xs text-primary font-semibold">Suggested: {topic.suggested_title}</p>
                <p className="text-xs text-muted-foreground mt-1 italic">Hook: "{topic.suggested_hook}"</p>
              </div>

              <div className="flex gap-2">
                <CopyButton text={topic.suggested_title} />
                <Button size="sm" onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(topic.suggested_title)}`)}>
                  Build Now <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </FeaturePage>
  );
}
