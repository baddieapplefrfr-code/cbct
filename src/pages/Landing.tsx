import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, ArrowRight, CheckCircle, Loader2, AlertTriangle,
  TrendingDown, MessageSquare, Brain, Lock,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchCompleteChannelData, isChannelConnected, formatCount,
  type FetchProgress, type ChannelData,
} from "@/lib/youtube-api";
import { callAI } from "@/lib/ai-service";
import { signInWithGoogle, isFullyConnected } from "@/lib/youtube-auth";

type Step = "input" | "loading" | "success" | "error";

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [insight, setInsight] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [oauthSuccess, setOauthSuccess] = useState(false);

  useEffect(() => {
    if (isChannelConnected()) navigate("/dashboard", { replace: true });
    if (searchParams.get("oauth") === "success") setOauthSuccess(true);
  }, []);

  async function handleAnalyse() {
    if (!url.trim()) { setError("Paste your YouTube channel URL above"); return; }
    setError("");
    setProgress(null);
    setStep("loading"); // Show spinner IMMEDIATELY — no frozen button

    try {
      const data = await fetchCompleteChannelData(url, setProgress);
      setChannel(data);

      // Generate urgent, specific insight
      const topVideo = data.videos.slice().sort((a: any, b: any) => b.views - a.views)[0];
      const recentAvg = Math.round(data.videos.slice(0, 5).reduce((s: number, v: any) => s + Number(v.views), 0) / Math.min(data.videos.length, 5));
      const allTimeAvg = data.avgViews;
      const trending = recentAvg < allTimeAvg * 0.8 ? "DOWN" : recentAvg > allTimeAvg * 1.2 ? "UP" : "FLAT";

      try {
        const aiInsight = await callAI(
          `You are a YouTube growth strategist. Write EXACTLY 2 sentences.
RULE 1: Sentence 1 MUST use a real number and sound alarming or urgent — NEVER say "great channel" or anything positive. If views are declining say so bluntly. If flat, name the problem.
RULE 2: Sentence 2 MUST give ONE action for THIS WEEK — name the exact day, format, or topic.
NO filler. Be a strategist not a cheerleader.`,
          `Channel: ${data.name}. Subscribers: ${formatCount(data.subscribers)}. All-time avg: ${allTimeAvg} views. Recent 5-video avg: ${recentAvg} (TRENDING ${trending}). Best day: ${data.bestDay}. Top video: "${topVideo?.title}" (${topVideo?.views} views). Last 3: ${data.videos.slice(0,3).map((v: any) => `"${v.title}" (${v.views})`).join(", ")}.`,
          { maxTokens: 100, temperature: 0.4 }
        );
        setInsight(aiInsight);
      } catch {
        const diff = recentAvg < allTimeAvg ? `${Math.round((1 - recentAvg / allTimeAvg) * 100)}% below` : "above";
        setInsight(`Your last 5 videos averaged ${formatCount(recentAvg)} views — ${diff} your channel average. Post on ${data.bestDay} this week and test a new thumbnail style.`);
      }
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Could not find that channel. Try your @handle directly.");
      setStep("error");
    }
  }

  async function handleGoogleConnect() {
    setConnectLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) { setError(err); setConnectLoading(false); }
    // On success browser redirects to /auth/callback automatically
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#080810", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(250,204,21,0.07) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 pt-14 pb-16">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-12">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)" }}>
            <Zap className="h-4 w-4" style={{ color: "#facc15" }} />
          </div>
          <span className="text-sm font-bold tracking-wide" style={{ color: "#facc15", fontFamily: "Syne, sans-serif" }}>
            CreatorBrain
          </span>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* INPUT */}
          {(step === "input" || step === "error") && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-2xl text-center">

              {oauthSuccess && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
                  <CheckCircle className="h-3.5 w-3.5" /> Google connected — private analytics unlocked
                </div>
              )}

              <h1 className="mb-5 leading-[1.05]" style={{
                fontFamily: "Syne, sans-serif", fontWeight: 800,
                fontSize: "clamp(34px, 6vw, 60px)", color: "#ffffff",
              }}>
                Stop guessing.<br />
                <span style={{ background: "linear-gradient(135deg,#facc15,#fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Start growing.
                </span>
              </h1>

              <p className="text-base mb-10 max-w-md mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Paste your channel URL. Get a full AI audit — why videos fail, what your audience wants next, and your exact action plan.
              </p>

              {/* URL Input */}
              <div className="flex gap-2 p-1.5 rounded-2xl mb-3" style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              }}>
                <Input
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAnalyse()}
                  placeholder="youtube.com/@yourchannel"
                  className="flex-1 border-0 bg-transparent text-white placeholder:text-white/25 h-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button onClick={handleAnalyse}
                  className="h-12 px-6 rounded-xl font-bold shrink-0 gap-2"
                  style={{ background: "#facc15", color: "#000", fontFamily: "Syne, sans-serif" }}>
                  <Zap className="h-4 w-4" /> Analyse
                </Button>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-sm mb-3 flex items-center justify-center gap-1.5"
                  style={{ color: "#f87171" }}>
                  <AlertTriangle className="h-3.5 w-3.5" /> {error}
                </motion.p>
              )}

              <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,0.22)" }}>
                Real YouTube data · Real AI analysis · Free to start
              </p>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or unlock private analytics</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Google Connect Button */}
              <Button onClick={handleGoogleConnect} disabled={connectLoading || isFullyConnected()} variant="outline"
                className="w-full h-12 rounded-xl gap-3 font-medium text-sm mb-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
                {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {isFullyConnected() ? "✓ Google Connected — Full Access Unlocked" : "Connect with Google — unlock CTR, retention & revenue"}
              </Button>

              <p className="text-[10px] text-center mb-10" style={{ color: "rgba(255,255,255,0.2)" }}>
                Connects via Supabase OAuth · Read-only access · Disconnect anytime
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: TrendingDown, label: "Why videos fail", desc: "Specific reasons, not guesses", color: "#f87171" },
                  { icon: MessageSquare, label: "What to make next", desc: "Mined from real comments", color: "#60a5fa" },
                  { icon: Brain, label: "Your AI strategist", desc: "Knows your channel cold", color: "#facc15" },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-4 text-left"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${f.color}15` }}>
                      <f.icon className="h-4 w-4" style={{ color: f.color }} />
                    </div>
                    <p className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>{f.label}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* LOADING */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-sm text-center">
              {!progress ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(250,204,21,0.15)", borderTopColor: "#facc15" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Finding your channel...</p>
                </div>
              ) : (
                <div>
                  <div className="h-12 w-12 rounded-full border-2 animate-spin mx-auto mb-6"
                    style={{ borderColor: "rgba(250,204,21,0.15)", borderTopColor: "#facc15" }} />
                  <h2 className="text-lg font-bold mb-6" style={{ fontFamily: "Syne, sans-serif" }}>
                    {progress.channelName ? `Analysing ${progress.channelName}...` : "Analysing..."}
                  </h2>
                  <div className="space-y-3 text-left mb-5">
                    {[
                      { key: "finding", label: "Finding your channel" },
                      { key: "videos", label: `Loading ${progress.videoCount || ""} videos`.trim() },
                      { key: "comments", label: "Reading comments" },
                      { key: "insights", label: "Building your growth profile" },
                    ].map(item => {
                      const order = ["finding","videos","comments","insights","done"];
                      const done = order.indexOf(progress.step) > order.indexOf(item.key);
                      const active = progress.step === item.key;
                      return (
                        <div key={item.key} className="flex items-center gap-3">
                          {done ? <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#4ade80" }} />
                            : active ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#facc15" }} />
                            : <div className="h-4 w-4 rounded-full shrink-0" style={{ border: "2px solid rgba(255,255,255,0.12)" }} />}
                          <span className="text-sm" style={{ color: done || active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.3 }} className="h-full rounded-full" style={{ background: "#facc15" }} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SUCCESS */}
          {step === "success" && channel && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg">
              {channel.banner && (
                <div className="absolute inset-0 pointer-events-none opacity-8"
                  style={{ backgroundImage: `url(${channel.banner})`, backgroundSize: "cover", filter: "blur(60px)" }} />
              )}
              <div className="relative">
                {/* Channel */}
                <div className="flex items-center gap-4 mb-5">
                  <img src={channel.avatar} alt={channel.name}
                    className="h-16 w-16 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid rgba(250,204,21,0.35)" }} />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>{channel.name}</h2>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {formatCount(channel.subscribers)} subscribers · {channel.videos.length} videos analysed
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 shrink-0" style={{ color: "#4ade80" }} />
                </div>

                {/* AI Insight — urgent */}
                <div className="rounded-2xl p-5 mb-5" style={{
                  background: "rgba(250,204,21,0.05)",
                  border: "1px solid rgba(250,204,21,0.18)",
                  borderLeft: "4px solid #facc15",
                }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#facc15" }}>
                    ⚡ First Insight
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>{insight}</p>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {[
                    { label: "Avg Views", value: formatCount(channel.avgViews) },
                    { label: "Best Day", value: (channel.bestDay || "Wed").slice(0,3) },
                    { label: "Videos", value: String(channel.videos.length) },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-base font-bold" style={{ fontFamily: "Syne, sans-serif", color: "#facc15" }}>{s.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <Button onClick={() => navigate("/dashboard")}
                  className="w-full h-14 text-base font-bold rounded-xl gap-2"
                  style={{ background: "#facc15", color: "#000", fontFamily: "Syne, sans-serif" }}>
                  Enter CreatorBrain <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
