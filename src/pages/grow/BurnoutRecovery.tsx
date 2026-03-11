import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Battery, Heart, Sun, Star, Calendar } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface RecoveryPlan {
  achievements: { stat: string; message: string }[];
  weeks: { week: number; content: string; effort_level: string; repromote: string }[];
  encouragement: string;
}

export default function BurnoutRecovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [mood, setMood] = useState<string | null>(null);

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
        "This creator is experiencing burnout. Generate a warm, supportive recovery plan. Include: 1) Their top achievements to remind them why they started (3 items), 2) A 4-week light schedule with only easy content formats, which existing videos to re-promote, and effort levels, 3) An encouraging personalized message. Return JSON with: achievements (array of {stat, message}), weeks (array of 4 {week, content, effort_level, repromote}), encouragement (string).",
        `${context}\n\nThis creator needs a gentle, achievable 4-week recovery plan. Be warm, supportive, and specific.`
      );

      const parsed = parseJsonFromResponse(result);
      if (parsed) setPlan(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const moodEmojis = [
    { emoji: "😫", label: "Exhausted" },
    { emoji: "😔", label: "Discouraged" },
    { emoji: "😐", label: "Meh" },
    { emoji: "🙂", label: "Okay" },
    { emoji: "😊", label: "Good" },
  ];

  if (loading) {
    return (
      <FeaturePage emoji="🔋" title="Recovery Mode" description="A gentle plan to maintain your channel stress-free">
        <LoadingSteps steps={["Reviewing your journey...", "Building a gentle plan...", "Preparing encouragement..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🔋" title="Recovery Mode" description="A gentle plan to maintain your channel stress-free">
      {plan && (
        <div className="space-y-8">
          {/* Mood check */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">How are you feeling today?</p>
            <div className="flex justify-center gap-4">
              {moodEmojis.map(m => (
                <button
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    mood === m.label ? "bg-primary/10 scale-110" : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Achievements */}
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" /> Remember Why You Started
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {plan.achievements?.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center"
                >
                  <p className="text-2xl font-black text-primary mb-1">{a.stat}</p>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Encouragement */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
            <Heart className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-sm leading-relaxed">{plan.encouragement}</p>
          </motion.div>

          {/* 4-week plan */}
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" /> Your 4-Week Light Schedule
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {plan.weeks?.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase text-primary">Week {week.week}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">{week.effort_level}</span>
                  </div>
                  <p className="text-sm font-medium mb-2">{week.content}</p>
                  <p className="text-xs text-muted-foreground">📢 Re-promote: {week.repromote}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
