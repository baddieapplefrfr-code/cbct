import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Heart, MessageSquare } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getVideoComments, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface Persona {
  age_range: string;
  primary_goal: string;
  pain_points: string[];
  loves_about_channel: string[];
  wishes_different: string[];
  vocabulary_style: string;
  content_preferences: string;
  write_for_this_person: string;
  one_sentence: string;
}

export default function AudiencePersona() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [persona, setPersona] = useState<Persona | null>(null);

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

      const allComments: string[] = [];
      for (const v of vids.slice(0, 5)) {
        const comments = await getVideoComments(v.id, 20);
        allComments.push(...comments);
      }
      setLoadStep(2);

      const context = getChannelContext(ch, vids);
      const res = await callGroq(
        `Analyse these YouTube comments to build a detailed audience persona. Return JSON: {age_range: string, primary_goal: string, pain_points: [string], loves_about_channel: [string], wishes_different: [string], vocabulary_style: string, content_preferences: string, write_for_this_person: string (one paragraph), one_sentence: string}`,
        `${context}\n\nComments (${allComments.length} total):\n${allComments.slice(0, 50).join("\n")}\n\nBuild the persona.`
      );

      const parsed = parseJsonFromResponse(res);
      if (parsed) setPersona(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="👥" title="Who Is Watching You?" description="I have no idea who actually watches my channel.">
        <LoadingSteps steps={["Fetching your videos...", `Scanning comments...`, "Building audience persona..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="👥" title="Who Is Watching You?" description="I have no idea who actually watches my channel.">
      {persona && (
        <div className="space-y-6">
          {/* Persona Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">👤</div>
              <div>
                <p className="font-bold text-xl">Your Ideal Viewer</p>
                <p className="text-sm text-muted-foreground">{persona.one_sentence}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{persona.age_range}</span>
              <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">{persona.primary_goal}</span>
              <span className="px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-semibold">{persona.content_preferences}</span>
            </div>
            <p className="text-xs text-muted-foreground">Language style: {persona.vocabulary_style}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Pain Points */}
            <div className="rounded-xl border border-destructive/20 bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Heart className="h-4 w-4 text-destructive" /> Pain Points</h3>
              {persona.pain_points?.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {p}</p>
              ))}
            </div>

            {/* Loves */}
            <div className="rounded-xl border border-success/20 bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Heart className="h-4 w-4 text-success" /> Loves About You</h3>
              {persona.loves_about_channel?.map((l, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {l}</p>
              ))}
            </div>

            {/* Wishes */}
            <div className="rounded-xl border border-warning/20 bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-warning" /> Wishes You'd Do</h3>
              {persona.wishes_different?.map((w, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {w}</p>
              ))}
            </div>
          </div>

          {/* Write For This Person */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase text-primary">✍️ Write For This Person</p>
              <CopyButton text={persona.write_for_this_person} />
            </div>
            <p className="text-sm leading-relaxed italic">{persona.write_for_this_person}</p>
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
