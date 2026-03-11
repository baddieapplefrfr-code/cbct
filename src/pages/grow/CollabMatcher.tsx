import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Users, Search, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface CollabProfile {
  archetype_name: string;
  subscriber_range: string;
  content_style: string;
  audience_overlap_reason: string;
  collab_idea: string;
  view_multiplier: string;
  compatibility_score: number;
  how_to_find: string;
}

export default function CollabMatcher() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [profiles, setProfiles] = useState<CollabProfile[]>([]);
  const [dreamMatch, setDreamMatch] = useState<CollabProfile | null>(null);
  const [activeCard, setActiveCard] = useState(0);

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
        `You are a YouTube collaboration strategist. For a creator with ${formatCount(ch.subscriberCount)} subscribers, generate 8 ideal collaboration partner profiles. These are not real channels — generate ideal profile archetypes that would be perfect collab partners. For each profile: archetype_name, subscriber_range, content_style, audience_overlap_reason, collab_idea (specific video that benefits both), view_multiplier (e.g. "2.5x"), compatibility_score (out of 100), how_to_find (YouTube search terms to find channels like this). Make each profile feel real and specific. Return JSON array sorted by compatibility_score descending.`,
        `${context}\n\nGenerate 8 ideal collab partner profiles for this creator.`
      );

      const parsed = parseJsonFromResponse(result);
      if (Array.isArray(parsed)) {
        const sorted = parsed.sort((a: any, b: any) => (b.compatibility_score || 0) - (a.compatibility_score || 0));
        setDreamMatch(sorted[0]);
        setProfiles(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="🤝" title="Collab Finder" description="Find your perfect YouTube collaboration partners">
        <LoadingSteps steps={["Analysing your channel...", "Generating ideal partner profiles...", "Scoring compatibility..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🤝" title="Collab Finder" description="Find your perfect YouTube collaboration partners">
      {/* Dream match */}
      {dreamMatch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold uppercase text-primary">Dream Collab Match</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-primary">{dreamMatch.compatibility_score}</span>
            </div>
            <div>
              <p className="font-bold text-lg">{dreamMatch.archetype_name}</p>
              <p className="text-sm text-muted-foreground">{dreamMatch.subscriber_range} subs · {dreamMatch.content_style}</p>
              <p className="text-sm mt-1 font-medium">{dreamMatch.collab_idea}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Swipe-style cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {profiles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card overflow-hidden card-glow"
          >
            {/* Header with compatibility */}
            <div className="p-5 pb-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg">{p.archetype_name}</p>
                  <p className="text-xs text-muted-foreground">{p.subscriber_range} subscribers</p>
                </div>
                <div className="relative h-14 w-14">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                    <motion.circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${p.compatibility_score * 2.51} ${251 - p.compatibility_score * 2.51}`}
                      initial={{ strokeDasharray: "0 251" }}
                      animate={{ strokeDasharray: `${p.compatibility_score * 2.51} ${251 - p.compatibility_score * 2.51}` }}
                      transition={{ duration: 1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black">{p.compatibility_score}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-2 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Content Style</p>
                <p className="text-sm">{p.content_style}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Why Audiences Match</p>
                <p className="text-sm">{p.audience_overlap_reason}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs font-semibold text-primary mb-1">💡 Collab Video Idea</p>
                <p className="text-sm font-medium">{p.collab_idea}</p>
                <p className="text-xs text-muted-foreground mt-1">Expected view multiplier: {p.view_multiplier}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(p.how_to_find)}`, "_blank")}
                >
                  <Search className="mr-1 h-3 w-3" /> Find Channels
                </Button>
                <CopyButton text={`${p.archetype_name}\n${p.collab_idea}\nSearch: ${p.how_to_find}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </FeaturePage>
  );
}
