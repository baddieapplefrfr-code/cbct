import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getVideoComments, getChannelContext, type ChannelData, type VideoData } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface VideoIdea {
  title: string;
  why: string;
  demand_score: number;
  competition: string;
  hook: string;
  best_day: string;
  best_time: string;
}

export default function NextVideo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

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

      // Fetch comments from last 5 videos
      const commentPromises = vids.slice(0, 5).map(v => getVideoComments(v.id, 20));
      const commentArrays = await Promise.all(commentPromises);
      const allComments = commentArrays.flat().slice(0, 100);
      setLoadStep(2);

      const context = getChannelContext(ch, vids);
      const result = await callGroq(
        "Based on this creator's channel performance data and what their audience is asking for in comments, generate 5 ranked video ideas. For each idea provide: compelling title, why this will perform well for THIS specific channel, estimated demand score 1-100, competition level low/medium/high, best hook for the first 15 seconds, best day and time to post. Format as JSON array with fields: title, why, demand_score, competition, hook, best_day, best_time.",
        `${context}\n\nAUDIENCE COMMENTS (from recent videos):\n${allComments.join("\n").slice(0, 3000)}`
      );

      const parsed = parseJsonFromResponse(result);
      if (Array.isArray(parsed)) {
        setIdeas(parsed.sort((a: any, b: any) => (b.demand_score || 0) - (a.demand_score || 0)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const competitionColor = (c: string) => {
    if (c?.toLowerCase() === "low") return "text-success bg-success/10";
    if (c?.toLowerCase() === "medium") return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  if (loading) {
    return (
      <FeaturePage emoji="🎯" title="Your Next Move" description="AI-powered video ideas based on real demand signals">
        <LoadingSteps steps={["Fetching your video history...", "Mining audience comments...", "Generating ranked ideas..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🎯" title="Your Next Move" description="AI-powered video ideas based on real demand signals">
      <div className="space-y-4">
        {ideas.map((idea, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            className="rounded-xl border border-border bg-card p-6 card-glow cursor-pointer"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl font-black text-primary/30">#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-semibold text-lg">{idea.title}</p>
                  <CopyButton text={idea.title} />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{idea.why}</p>

                {/* Demand score bar */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-muted-foreground">Demand</span>
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${idea.demand_score}%` }}
                      transition={{ delay: i * 0.12 + 0.3, duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-sm font-bold text-primary">{idea.demand_score}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${competitionColor(idea.competition)}`}>
                    <Shield className="h-3 w-3 inline mr-1" />{idea.competition} competition
                  </span>
                  <span className="text-xs text-muted-foreground">
                    📅 {idea.best_day} {idea.best_time}
                  </span>
                </div>

                {expanded === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <p className="text-xs font-semibold uppercase text-primary mb-2">Suggested Hook</p>
                    <p className="text-sm italic">"{idea.hook}"</p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/create/video-machine?topic=${encodeURIComponent(idea.title)}`);
                      }}
                    >
                      Build This Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </FeaturePage>
  );
}
