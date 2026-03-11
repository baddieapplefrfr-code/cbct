import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Mic, ChevronDown, ChevronUp, RefreshCw, Share2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import ShareInsight from "@/components/ShareInsight";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface RoastSegment {
  setup: string;
  punchline: string;
  real_truth: string;
  fix_action: string;
  weakness_category: string;
}

interface RoastData {
  opening: string;
  roasts: RoastSegment[];
  redemption_speech: string;
  final_verdict: string;
  channel_name: string;
}

const HEAT_LEVELS = [
  { label: "Mild Warmth", emoji: "🌶️", value: "mild", desc: "Constructive with a smile" },
  { label: "Medium Roast", emoji: "🔥", value: "medium", desc: "Honest and stinging" },
  { label: "Nuclear", emoji: "☢️", value: "nuclear", desc: "No survivors" },
];

const categoryEmojis: Record<string, string> = {
  thumbnails: "🖼️",
  titles: "✍️",
  consistency: "📅",
  engagement: "💬",
  niche: "🎯",
  content: "🎬",
};

export default function ChannelRoast() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [heatLevel, setHeatLevel] = useState("medium");
  const [roastData, setRoastData] = useState<RoastData | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [showRedemption, setShowRedemption] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  useEffect(() => {
    if (roastData && visibleCount < roastData.roasts.length) {
      const timer = setTimeout(() => setVisibleCount(c => c + 1), 1200);
      return () => clearTimeout(timer);
    }
    if (roastData && visibleCount >= roastData.roasts.length && !showRedemption) {
      const timer = setTimeout(() => setShowRedemption(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [roastData, visibleCount, showRedemption]);

  async function loadRoast() {
    setLoading(true);
    setRoastData(null);
    setVisibleCount(0);
    setFlipped({});
    setShowRedemption(false);
    setStarted(true);
    setLoadStep(0);

    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 15);
      setLoadStep(1);

      const context = getChannelContext(ch, vids);
      const best = [...vids].sort((a, b) => b.viewCount - a.viewCount)[0];
      const worst = [...vids].sort((a, b) => a.viewCount - b.viewCount)[0];

      const gaps = vids.slice(0, -1).map((v, i) => {
        const next = vids[i + 1];
        return Math.round((new Date(v.publishedAt).getTime() - new Date(next.publishedAt).getTime()) / 86400000);
      });
      const maxGap = Math.max(...gaps, 0);
      setLoadStep(2);

      const result = await callGroq(
        `You are Kevin Hart meets a YouTube algorithm PhD. You are performing a SOLD OUT comedy roast of this creator's channel at Madison Square Garden. The crowd is full of creators who GET YouTube. Be SAVAGE. Be SPECIFIC. Every single joke MUST reference their REAL data — actual video titles, actual view counts, actual posting gaps, actual subscriber count. Name specific videos by title in your jokes. If they have a video that got low views, DESTROY it by name. If they haven't posted consistently, mock the exact gap in days. NEVER be generic — every line should only work for THIS channel. Then reveal that inside every joke is a real truth that would help them grow. Savageness level: ${heatLevel}. Return JSON: {"opening": "2 lines of crowd-work about this specific channel — reference their name and sub count", "roasts": [{"setup": "setup referencing specific data", "punchline": "devastating punchline using their actual numbers", "real_truth": "the real growth insight hidden in the joke", "fix_action": "one specific action to fix this weakness", "weakness_category": "thumbnails|titles|consistency|engagement|niche|content"}], "redemption_speech": "genuinely encouraging speech turning every joke into serious advice — be real and motivational", "final_verdict": "one powerful sentence defining what this channel is and what it must become", "channel_name": "${ch.title}"}. Generate exactly 6 roast segments.`,
        `${context}\n\nBest performing: "${best?.title}" (${formatCount(best?.viewCount || 0)} views)\nWorst performing: "${worst?.title}" (${formatCount(worst?.viewCount || 0)} views)\nLongest gap between uploads: ${maxGap} days\nChannel name: ${ch.title}\nSubscribers: ${formatCount(ch.subscriberCount)}\n\nRoast this channel NOW. Level: ${heatLevel.toUpperCase()}`
      );

      const parsed = parseJsonFromResponse(result);
      if (parsed) {
        setRoastData({ ...parsed, channel_name: parsed.channel_name || ch.title });
      } else {
        setRoastData({
          opening: result.slice(0, 200),
          roasts: [{ setup: "Couldn't parse the roast", punchline: "But trust me, it was brutal", real_truth: "Try again", fix_action: "Click roast again", weakness_category: "content" }],
          redemption_speech: "You've got potential. Keep going.",
          final_verdict: "A creator on the verge of something great.",
          channel_name: ch.title,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at top center, hsl(0 60% 10% / 0.4) 0%, transparent 50%)"
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(400px circle at 20% 80%, hsl(0 80% 50% / 0.03), transparent 60%)"
      }} />

      <div className="relative p-6 md:p-8 max-w-[920px] mx-auto">
        

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={started ? {} : { scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative inline-block mb-6"
          >
            <div className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto relative" style={{
              background: "linear-gradient(135deg, hsl(0 72% 51% / 0.15), hsl(0 72% 51% / 0.05))",
              border: "1px solid hsl(var(--destructive) / 0.2)"
            }}>
              <Mic className="h-10 w-10" style={{ color: "hsl(var(--destructive))" }} />
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
            The <span style={{ color: "hsl(var(--destructive))" }}>Roast</span> Room
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
            Where your channel gets destroyed — then rebuilt stronger
          </p>

          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold" style={{
            background: "hsl(var(--destructive) / 0.08)",
            border: "1px solid hsl(var(--destructive) / 0.15)",
            color: "hsl(var(--destructive))"
          }}>
            <Flame className="h-3.5 w-3.5" /> LIVE AT MADISON SQUARE GARDEN
          </div>
        </motion.div>

        {/* Heat level selector */}
        {!started && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
            <p className="t-label text-muted-foreground text-center mb-4">Choose your pain level</p>
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
              {HEAT_LEVELS.map(h => (
                <button
                  key={h.value}
                  onClick={() => setHeatLevel(h.value)}
                  className="rounded-xl p-4 text-center transition-all duration-200"
                  style={{
                    background: heatLevel === h.value ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--background-card))",
                    border: `2px solid ${heatLevel === h.value ? "hsl(var(--destructive) / 0.4)" : "hsl(var(--border))"}`,
                    transform: heatLevel === h.value ? "scale(1.03)" : "scale(1)"
                  }}
                >
                  <span className="text-2xl block mb-1">{h.emoji}</span>
                  <span className="text-sm font-bold block" style={heatLevel === h.value ? { color: "hsl(var(--destructive))" } : undefined}>{h.label}</span>
                  <span className="text-[11px] text-muted-foreground">{h.desc}</span>
                </button>
              ))}
            </div>
            <div className="text-center">
              <Button
                size="lg"
                className="rounded-xl px-10 h-14 text-lg font-bold gap-2 shadow-[0_0_30px_hsl(0_72%_51%/0.2)]"
                style={{ background: "hsl(var(--destructive))", color: "white" }}
                onClick={loadRoast}
              >
                <Flame className="h-5 w-5" /> Roast My Channel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="max-w-md mx-auto">
            <LoadingSteps
              steps={[
                "Stalking your channel for weaknesses...",
                "Crafting personalised jokes from your data...",
                "Hiding real growth advice inside every burn..."
              ]}
              currentStep={loadStep}
            />
          </div>
        )}

        {/* Opening */}
        {roastData && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-10 rounded-2xl p-6"
            style={{ background: "hsl(var(--background-section))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">🎤 THE OPENING</p>
            <p className="text-lg font-medium italic text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              "{roastData.opening}"
            </p>
          </motion.div>
        )}

        {/* Progress indicator */}
        {roastData && visibleCount > 0 && visibleCount < roastData.roasts.length && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {roastData.roasts.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i < visibleCount ? 24 : 8,
                  background: i < visibleCount ? "hsl(var(--destructive))" : "hsl(var(--border))"
                }}
              />
            ))}
          </div>
        )}

        {/* Roast segments */}
        <div className="space-y-4">
          <AnimatePresence>
            {roastData?.roasts.slice(0, visibleCount).map((roast, i) => {
              const isFlipped = flipped[i];
              const emoji = categoryEmojis[roast.weakness_category] || "🎯";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="rounded-2xl p-6 relative overflow-hidden transition-all duration-300"
                    style={{
                      background: "hsl(var(--background-card))",
                      border: `1px solid ${isFlipped ? "hsl(var(--success) / 0.25)" : "hsl(var(--destructive) / 0.15)"}`,
                    }}
                  >
                    {/* Subtle glow on left */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{
                      background: isFlipped ? "hsl(var(--success))" : "hsl(var(--destructive))"
                    }} />

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="t-label text-[10px] text-muted-foreground">
                          {roast.weakness_category?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-mono">#{i + 1}</span>
                        <CopyButton text={`${roast.setup} ${roast.punchline}`} />
                      </div>
                    </div>

                    {!isFlipped ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{roast.setup}</p>
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-base font-bold mb-4 leading-relaxed"
                          style={{ color: "hsl(var(--destructive))" }}
                        >
                          🔥 {roast.punchline}
                        </motion.p>
                        <button
                          onClick={() => setFlipped(p => ({ ...p, [i]: true }))}
                          className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                          style={{ color: "hsl(var(--success))" }}
                        >
                          <Sparkles className="h-3 w-3" /> Reveal the real advice
                        </button>
                      </>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="rounded-xl p-4 mb-3" style={{ background: "hsl(var(--success) / 0.05)", borderLeft: "3px solid hsl(var(--success))" }}>
                          <p className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: "hsl(var(--success))" }}>The Real Truth</p>
                          <p className="text-sm text-foreground/80 leading-relaxed">{roast.real_truth}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: "hsl(var(--info) / 0.05)", borderLeft: "3px solid hsl(var(--info))" }}>
                          <p className="text-xs font-bold mb-0.5 uppercase tracking-wider" style={{ color: "hsl(var(--info))" }}>Fix It</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{roast.fix_action}</p>
                        </div>
                        <button
                          onClick={() => setFlipped(p => ({ ...p, [i]: false }))}
                          className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
                        >
                          <ChevronUp className="h-3 w-3" /> Back to joke
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Redemption + Verdict */}
        {showRedemption && roastData && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10 rounded-2xl p-8 text-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--success) / 0.04), hsl(var(--background-card)))",
                border: "1px solid hsl(var(--success) / 0.15)"
              }}
            >
              <p className="t-label mb-4" style={{ color: "hsl(var(--success))" }}>✨ THE REAL TALK</p>
              <p className="text-base leading-relaxed text-foreground/80 max-w-2xl mx-auto">{roastData.redemption_speech}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5 rounded-2xl p-8 text-center"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--background-card)))",
                border: "1px solid hsl(var(--primary) / 0.3)",
                boxShadow: "0 0 40px hsl(var(--primary) / 0.06)"
              }}
            >
              <p className="t-label text-primary mb-3">⚡ THE VERDICT</p>
              <p className="text-xl md:text-2xl font-black gradient-text leading-snug">{roastData.final_verdict}</p>

              <div className="flex items-center justify-center gap-3 mt-6">
                <ShareInsight
                  title={`${roastData.channel_name || "Channel"} Roast Verdict`}
                  value={roastData.final_verdict}
                  subtitle={`Roasted at ${heatLevel} heat 🔥`}
                  featureName="CreatorBrain Roast Room"
                />
                <CopyButton
                  text={roastData.roasts.map(r => `🔥 ${r.punchline}`).join("\n\n") + `\n\n⚡ ${roastData.final_verdict}\n\nGenerated by CreatorBrain`}
                  className="h-9 w-auto px-3"
                />
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center gap-3 mt-6"
            >
              <Button
                onClick={() => { setStarted(false); setRoastData(null); }}
                variant="outline"
                className="rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-4 w-4" /> Roast Me Again
              </Button>
            </motion.div>

            
          </>
        )}
      </div>
    </div>
  );
}
