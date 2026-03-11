import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface NicheData {
  authority_score: number;
  niche: string;
  ranking_statement: string;
  topics_you_own: string[];
  topics_up_for_grabs: string[];
  recommendation: string;
}

export default function NicheAuthority() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<NicheData | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 30);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);
      const result = await callAI(
        `Analyse niche authority and topic ownership. Return JSON: {authority_score (0-100), niche (string), ranking_statement (string like "You are the #3 most consistent creator covering X on YouTube"), topics_you_own: [string] (3-5 topics you dominate), topics_up_for_grabs: [string] (3-5 underserved topics in your niche), recommendation (one actionable sentence)}`,
        `${context}\n\nAnalyse topic authority and niche positioning.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const scoreStyle = (s: number) => {
    if (s >= 70) return { color: "hsl(var(--success))" };
    if (s >= 40) return { color: "hsl(var(--warning))" };
    return { color: "hsl(var(--destructive))" };
  };

  if (loading) return (
    <FeaturePage emoji="👑" title="Niche Authority" description="How dominant are you in your niche?">
      <LoadingSteps steps={["Scanning your niche...", "Analysing topic coverage...", "Calculating authority..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="👑" title="Niche Authority Score" description="How much of your niche do you own?">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">AUTHORITY SCORE</p>
            <p className="animate-count" style={{ fontSize: 64, fontWeight: 800, ...scoreStyle(data.authority_score) }}>{data.authority_score}</p>
            <p className="text-lg mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>{data.ranking_statement}</p>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--success))" }}>✅ TOPICS YOU OWN</p>
              <div className="flex flex-wrap gap-2">
                {data.topics_you_own?.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>{t}</span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>🟣 UP FOR GRABS</p>
              <div className="flex flex-wrap gap-2">
                {data.topics_up_for_grabs?.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: "hsl(var(--color-opportunity) / 0.12)", color: "hsl(var(--color-opportunity))" }}>{t}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.24 }} className="p-8 rounded-xl text-center" style={{ background: "hsl(var(--primary) / 0.1)", border: "2px solid hsl(var(--primary) / 0.3)" }}>
            <p className="t-label mb-2" style={{ color: "hsl(var(--primary))" }}>🎯 NEXT MOVE</p>
            <p className="text-lg font-semibold">{data.recommendation}</p>
            <CopyButton text={data.recommendation} className="mt-3" />
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
