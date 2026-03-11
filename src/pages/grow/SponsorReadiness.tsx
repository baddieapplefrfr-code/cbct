import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getVideoComments, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface ReadinessData {
  overall_score: number;
  factors: { name: string; score: number; tip: string }[];
  brand_categories: { category: string; why: string }[];
  media_kit: string;
  outreach_email: string;
  improvements: string[];
}

export default function SponsorReadiness() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<ReadinessData | null>(null);

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

      const comments = await getVideoComments(vids[0]?.id || "", 20);
      setLoadStep(2);

      const context = getChannelContext(ch, vids);
      const avgViews = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
      const engRate = vids.reduce((s, v) => s + v.likeCount + v.commentCount, 0) / vids.reduce((s, v) => s + v.viewCount, 0) * 100;

      const res = await callGroq(
        `Assess this YouTube creator's sponsor readiness. Return JSON: {overall_score: number 0-100, factors: [{name: string, score: number 0-100, tip: string}] (6 factors: Audience Size, Engagement Quality, Content Consistency, Niche Value, Brand Safety, Audience Loyalty), brand_categories: [{category: string, why: string}] (3 categories), media_kit: string (paragraph), outreach_email: string (template), improvements: [string] (3 improvements)}`,
        `${context}\n\nEngagement rate: ${engRate.toFixed(2)}%\nAvg views: ${Math.round(avgViews)}\nSample comments: ${comments.slice(0, 10).join(" | ")}\n\nAssess sponsor readiness.`
      );

      const parsed = parseJsonFromResponse(res);
      if (parsed) setData(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (s: number) => s >= 70 ? "text-success" : s >= 40 ? "text-warning" : "text-destructive";

  if (loading) {
    return (
      <FeaturePage emoji="💰" title="Brand Deal Ready?" description="I want brand deals but I don't know if I'm ready.">
        <LoadingSteps steps={["Fetching channel metrics...", "Analysing audience quality...", "Calculating readiness score..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="💰" title="Brand Deal Ready?" description="I want brand deals but I don't know if I'm ready.">
      {data && (
        <div className="space-y-6">
          {/* Score */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${data.overall_score * 3.27} 327`}
                  className={scoreColor(data.overall_score)}
                  initial={{ strokeDasharray: "0 327" }}
                  animate={{ strokeDasharray: `${data.overall_score * 3.27} 327` }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-black ${scoreColor(data.overall_score)}`}>{data.overall_score}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Sponsor Readiness Score</p>
          </motion.div>

          {/* Factors */}
          <div className="grid md:grid-cols-2 gap-3">
            {data.factors?.map((f, i) => (
              <motion.div key={f.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{f.name}</span>
                  <span className={`text-sm font-bold ${scoreColor(f.score)}`}>{f.score}/100</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${f.score}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${f.score >= 70 ? "bg-success" : f.score >= 40 ? "bg-warning" : "bg-destructive"}`} />
                </div>
                <p className="text-xs text-muted-foreground">{f.tip}</p>
              </motion.div>
            ))}
          </div>

          {/* Brand Categories */}
          <div>
            <h3 className="font-semibold mb-3">🏷️ Brands That Would Want You</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {data.brand_categories?.map((b, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-primary mb-1">{b.category}</p>
                  <p className="text-xs text-muted-foreground">{b.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Media Kit */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">📋 Auto-Generated Media Kit</p>
              <CopyButton text={data.media_kit} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.media_kit}</p>
          </div>

          {/* Outreach Email */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase text-primary">📧 Outreach Email Template</p>
              <CopyButton text={data.outreach_email} />
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{data.outreach_email}</pre>
          </div>

          {/* Improvements */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold mb-3">📈 Improvement Checklist</p>
            {data.improvements?.map((imp, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{imp}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
