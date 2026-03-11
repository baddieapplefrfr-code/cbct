import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, ArrowRight, Loader2, AlertTriangle, CheckCircle, TrendingUp, Brain, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchCompleteChannelData, isChannelConnected, formatCount, type FetchProgress, type ChannelData } from "@/lib/youtube-api";
import { callAI } from "@/lib/ai-service";

type Step = "input" | "loading" | "success" | "error";

export default function Landing() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [insight, setInsight] = useState("");

  useEffect(() => {
    if (isChannelConnected()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  async function handleAnalyse() {
    if (!url.trim()) {
      setError("Please enter your YouTube channel URL or @handle");
      return;
    }
    setStep("loading");
    setError("");
    setProgress(null);
    try {
      const channelData = await fetchCompleteChannelData(url, setProgress);
      setChannel(channelData);
      try {
        const aiInsight = await callAI(
          "You are a brutally direct YouTube growth coach. Give exactly 2 sentences. Sentence 1 must contain a real number showing how recent videos performed vs average. Sentence 2 must be one specific action with a specific day of the week. Never say 'great channel'. Never be vague.",
          `Channel: ${channelData.name}. Subscribers: ${channelData.subscribers}. Avg views: ${channelData.avgViews}. Best upload day: ${channelData.bestDay}. Recent videos: ${channelData.videos.slice(0,5).map(v => `"${v.title}" - ${v.views} views`).join(", ")}.`,
          { maxTokens: 150 }
        );
        setInsight(aiInsight);
      } catch {
        setInsight(`Your channel has ${formatCount(channelData.subscribers)} subscribers. Let's find your biggest growth opportunities.`);
      }
      setStep("success");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("quota")) setError("YouTube API quota reached. Please try again in a few hours.");
      else if (msg.includes("not found") || msg.includes("404")) setError("Channel not found. Try: youtube.com/@channelname");
      else setError(msg || "Something went wrong. Please try again.");
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(800px circle at 50% 0%, hsl(48 96% 53% / 0.07), transparent 60%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "radial-gradient(circle, hsl(0 0% 100% / 0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <AnimatePresence mode="wait">

        {/* ── INPUT ── */}
        {(step === "input" || step === "error") && (
          <motion.div key="input" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="w-full max-w-2xl mx-auto text-center">
            
            {/* Badge */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
              <Zap className="h-3.5 w-3.5" />
              Free AI Growth Team for YouTube Creators
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-4 tracking-tight font-display">
              Stop Guessing.<br />
              <span style={{ background: "linear-gradient(135deg, hsl(48 96% 53%), hsl(38 96% 60%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Start Growing.
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
              Paste your channel URL. Get your personal AI strategist in 30 seconds — for free.
            </p>

            {/* Input card */}
            <div className="rounded-2xl p-6 mb-4" style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--primary) / 0.2)", boxShadow: "0 0 60px hsl(var(--primary) / 0.08)" }}>
              <div className="flex gap-3">
                <Input
                  placeholder="youtube.com/@yourchannel or @handle"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
                  className="h-12 rounded-xl text-base"
                  style={{ background: "hsl(var(--background-section))", border: "1px solid hsl(var(--border))" }}
                />
                <Button onClick={handleAnalyse} className="h-12 px-6 rounded-xl font-bold text-base shrink-0" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">No account required. Works with any public YouTube channel.</p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { icon: TrendingUp, text: "Video Autopsy" },
                { icon: Brain, text: "AI Coach Max" },
                { icon: MessageSquare, text: "Comment Intelligence" },
                { icon: Zap, text: "Growth Action Plan" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-muted-foreground" style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--border))" }}>
                  <f.icon className="h-3.5 w-3.5 text-primary" />
                  {f.text}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md mx-auto text-center">
            <div className="rounded-2xl p-8" style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--border))" }}>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Analysing your channel...</h2>
              {progress ? (
                <div className="space-y-2 text-left mt-4">
                  {[
                    { label: "Channel data", done: !!progress.channelDone },
                    { label: "Recent videos", done: !!progress.videosDone },
                    { label: "Comments", done: !!progress.commentsDone },
                    { label: "AI insights", done: !!progress.insightsDone },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 text-sm">
                      {s.done
                        ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                        : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      }
                      <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Connecting to YouTube...</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && channel && (
          <motion.div key="success" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg mx-auto">
            <div className="rounded-2xl p-6 mb-4 text-center" style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--primary) / 0.3)", boxShadow: "0 0 60px hsl(var(--primary) / 0.1)" }}>
              
              {/* Channel header */}
              <div className="flex items-center justify-center gap-3 mb-5">
                {channel.avatar && <img src={channel.avatar} alt="" className="h-14 w-14 rounded-full ring-2 ring-primary/30" />}
                <div className="text-left">
                  <h2 className="text-xl font-black font-display">{channel.name}</h2>
                  <p className="text-sm text-muted-foreground">{formatCount(channel.subscribers)} subscribers</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Avg Views", value: formatCount(channel.avgViews) },
                  { label: "Best Day", value: channel.bestDay?.slice(0, 3) || "—" },
                  { label: "Videos", value: channel.videos?.length?.toString() || "0" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: "hsl(var(--background-section))" }}>
                    <p className="text-lg font-black text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* AI Insight */}
              {insight && (
                <div className="rounded-xl p-4 mb-5 text-left" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Diagnosis</span>
                  </div>
                  <p className="text-sm leading-relaxed">{insight}</p>
                </div>
              )}

              {/* Urgency */}
              <div className="rounded-xl p-3 flex items-center gap-2 mb-5" style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">Every week without a strategy is growth you're leaving behind.</p>
              </div>

              <Button onClick={() => navigate("/dashboard")} className="w-full h-12 rounded-xl font-bold text-base" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                Enter CreatorBrain <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
