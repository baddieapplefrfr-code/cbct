import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonSafely } from "@/lib/ai-service";
import { getVideoComments } from "@/lib/youtube-api";
import type { VideoData } from "@/lib/youtube-api";
import ShareInsight from "@/components/ShareInsight";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { ArrowRight, ThumbsUp, MessageSquare, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

function classifyEmotion(text: string): { emotion: string; color: string } {
  const t = text.toLowerCase();
  if (/love|great|amazing|thank|best|awesome|incredible|fantastic/.test(t)) return { emotion: "love", color: "#4ade80" };
  if (/\?|how|what|when|why|can you|could you|will you/.test(t)) return { emotion: "question", color: "#60a5fa" };
  if (/bad|wrong|hate|worst|dislike|confused|disappointed|terrible/.test(t)) return { emotion: "frustrated", color: "#f87171" };
  if (/idea|should|could|make a video|next video|please do|would love/.test(t)) return { emotion: "idea", color: "#facc15" };
  return { emotion: "neutral", color: "#a1a1aa" };
}

const groupLabels: Record<string, { icon: string; label: string }> = {
  idea: { icon: "💡", label: "VIDEO IDEAS" },
  question: { icon: "🔵", label: "QUESTIONS" },
  love: { icon: "💚", label: "LOVE" },
  frustrated: { icon: "🔴", label: "ISSUES" },
  neutral: { icon: "💬", label: "OTHER" },
};

export default function CommentIntelligence() {
  const navigate = useNavigate();
  const { channel, videos, loading: dataLoading, channelContext } = useChannelData();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [tab, setTab] = useState<"comments" | "insights">("comments");

  useEffect(() => { if (videos.length > 0 && !selectedVideoId) setSelectedVideoId(videos[0].id); }, [videos]);
  useEffect(() => { if (selectedVideoId && channel) loadComments(); }, [selectedVideoId]);

  async function loadComments() {
    setLoading(true); setStep(0);
    try {
      const cmts = await getVideoComments(selectedVideoId, 50);
      setStep(1);
      const res = await callAI(
        `You are a YouTube audience intelligence analyst and growth advisor. Analyse these comments and tell the creator exactly what to do.
Return ONLY valid JSON:
{
  "verdict": "One sentence summary of what this audience wants most",
  "top_video_idea": {
    "title": "Exact video title to make next",
    "why": "Why this would perform well based on comments",
    "demand_score": 85,
    "hook": "Opening line for this video"
  },
  "video_ideas": [
    {"idea": "specific video title", "demand_score": 80, "proof": "exact comment that proves demand"}
  ],
  "content_gaps": ["topic viewers asked about that creator hasn't covered"],
  "complaints": [{"complaint": "specific issue", "fix": "exact change to make"}],
  "top_request": "The single most requested topic in one sentence",
  "superfan_insights": "What your most loyal viewers have in common"
}
Give 6+ video_ideas. Be brutally specific.`,
        `${channelContext}\n\nCOMMENTS (${cmts.length} total):\n${cmts.slice(0, 150).join("\n---\n")}`,
        { maxTokens: 2500 }
      );
      setStep(2);
      const data = parseJsonSafely(res);
      setAnalysis(data);
      
      // Build comment objects with emotion classification
      const classified = cmts.map((c: string) => {
        const { emotion, color } = classifyEmotion(c);
        return { text: c, emotion, color };
      });
      setComments(classified);
    } catch {}
    setLoading(false);
  }

  async function generateReply(commentText: string, index: number) {
    setReplyingTo(index);
    setReplyLoading(true);
    try {
      const reply = await callAI(
        `You are the creator of "${channel?.name}". Write a warm, authentic reply to this YouTube comment. Keep it under 2 sentences. Be genuinely helpful and on-brand.`,
        `Comment: "${commentText}"`
      );
      setReplyText(reply);
    } catch {
      setReplyText("Could not generate reply — try again.");
    }
    setReplyLoading(false);
  }

  // Group comments by emotion
  const grouped = comments.reduce<Record<string, typeof comments>>((acc, c) => {
    const key = c.emotion || "neutral";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="⛏" title="Comment Intelligence" description="Mine your comments for ideas, sentiment, and reply opportunities">
        <LoadingSteps steps={["Loading comments...", "Analysing sentiment...", "Building insights..."]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="⛏" title="Comment Intelligence" description="Mine your comments for ideas, sentiment, and reply opportunities">
      {/* Make This Video Next — verdict card at top */}
      {analysis?.top_video_idea && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-6"
          style={{ background: "hsl(var(--primary) / 0.06)", border: "2px solid hsl(var(--primary) / 0.2)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">🎯 Make This Video Next</p>
          <h2 className="text-xl font-bold mb-2">{analysis.top_video_idea?.title || analysis.verdict}</h2>
          <p className="text-sm text-muted-foreground mb-3">{analysis.top_video_idea?.why}</p>
          {analysis.top_video_idea?.hook && (
            <div className="rounded-lg p-3 mb-4" style={{ background: "hsl(var(--secondary))" }}>
              <p className="text-xs font-semibold text-primary mb-1">Opening hook:</p>
              <p className="text-sm italic">"{analysis.top_video_idea.hook}"</p>
            </div>
          )}
          <Button onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(analysis.top_video_idea?.title || analysis.verdict || "")}`)}>
            Build This Video <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Video selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
        {videos.slice(0, 8).map(v => (
          <button key={v.id} onClick={() => setSelectedVideoId(v.id)} className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${selectedVideoId === v.id ? "border-primary" : "border-transparent"}`}>
            <img src={v.thumbnail} alt={v.title} className="w-24 h-14 object-cover" />
          </button>
        ))}
      </div>

      {/* Mobile tab toggle */}
      <div className="md:hidden flex gap-2 mb-4">
        <button 
          onClick={() => setTab("comments")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "comments" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Comments
        </button>
        <button 
          onClick={() => setTab("insights")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "insights" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Insights
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left — Comments (60%) */}
        <div className={`md:col-span-3 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin ${tab === "insights" ? "hidden md:block" : ""}`}>
          {Object.entries(grouped).map(([emotion, emotionComments]) => {
            const info = groupLabels[emotion] || groupLabels.neutral;
            return (
              <div key={emotion}>
                <div className="flex items-center gap-2 my-4">
                  <div className="h-px flex-1" style={{ background: "hsl(var(--border))" }} />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {info.icon} {info.label} ({emotionComments.length})
                  </span>
                  <div className="h-px flex-1" style={{ background: "hsl(var(--border))" }} />
                </div>
                {emotionComments.map((c: any, i: number) => {
                  const globalIndex = comments.indexOf(c);
                  const isReplying = replyingTo === globalIndex;
                  
                  return (
                    <motion.div 
                      key={globalIndex} 
                      initial={{ opacity: 0, x: -8 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: Math.min(i * 0.03, 0.3) }} 
                      className="rounded-lg p-4 mb-2 group"
                      style={{ 
                        borderLeft: `4px solid ${c.color}`, 
                        background: "hsl(var(--background-card))", 
                        border: `1px solid hsl(var(--border))`, 
                        borderLeftWidth: "4px", 
                        borderLeftColor: c.color 
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: `${c.color}22`, color: c.color }}
                        >
                          {c.text?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span 
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: `${c.color}15`, color: c.color }}
                        >
                          {c.emotion}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{c.text}</p>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => generateReply(c.text, globalIndex)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
                          style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}
                        >
                          ↩️ Reply with AI
                        </button>
                        <button 
                          onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(c.text.slice(0, 80))}`)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
                          style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
                        >
                          💡 Use as Idea
                        </button>
                      </div>

                      {/* AI Reply panel */}
                      {isReplying && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 p-3 rounded-lg"
                          style={{ background: "hsl(var(--info) / 0.06)", border: "1px solid hsl(var(--info) / 0.15)" }}
                        >
                          {replyLoading ? (
                            <div className="h-8 w-full rounded bg-secondary animate-pulse" />
                          ) : (
                            <div className="flex items-start gap-2">
                              <p className="text-xs flex-1" style={{ color: "hsl(var(--info))" }}>{replyText}</p>
                              <CopyButton text={replyText} />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Right — Intelligence (40%) */}
        <div className={`md:col-span-2 space-y-4 ${tab === "comments" ? "hidden md:block" : ""}`}>
          {analysis && (
            <div className="space-y-4">
              {/* Top Video Idea */}
              {analysis.top_video_idea && (
                <div className="rounded-xl p-4" style={{
                  background: "rgba(250,204,21,0.08)",
                  border: "1px solid rgba(250,204,21,0.2)",
                  borderLeft: "4px solid #facc15",
                }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#facc15" }}>
                    � Make This Video Next
                  </p>
                  <p className="text-base font-bold mb-2">{analysis.top_video_idea.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{analysis.top_video_idea.why}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold">Demand Score:</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(250,204,21,0.2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${analysis.top_video_idea.demand_score || 85}%`, background: "#facc15" }} />
                    </div>
                    <span className="text-xs font-bold">{analysis.top_video_idea.demand_score || 85}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    <strong>Hook:</strong> "{analysis.top_video_idea.hook}"
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full rounded-lg text-xs"
                    onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(analysis.top_video_idea.title)}`)}
                  >
                    Build This Video → <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Verdict */}
              {analysis.verdict && (
                <div className="rounded-xl p-4" style={{ background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">🔥 Audience Verdict</p>
                  <p className="text-sm">{analysis.verdict}</p>
                </div>
              )}

              {/* More Video Ideas */}
              {analysis.video_ideas && analysis.video_ideas.length > 0 && (
                <div className="cb-card">
                  <p className="t-label text-muted-foreground mb-3">More Video Ideas</p>
                  {analysis.video_ideas.slice(0, 4).map((idea: any, i: number) => (
                    <div key={i} className="mb-3 pb-3 border-b border-border/30 last:border-0 last:pb-0 last:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm flex-1 font-medium">{idea.idea}</span>
                        <span className="text-xs font-bold text-primary">{idea.demand_score}x</span>
                      </div>
                      {idea.proof && (
                        <p className="text-xs text-muted-foreground mb-2">"Because: {idea.proof}"</p>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2 rounded-lg text-xs"
                        onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(idea.idea)}`)}
                      >
                        Build This → <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Request */}
              {analysis.top_request && (
                <div className="rounded-xl p-4" style={{ background: "hsl(var(--info) / 0.06)", border: "1px solid hsl(var(--info) / 0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--info))" }}>
                    💬 Most Requested Topic
                  </p>
                  <p className="text-sm">{analysis.top_request}</p>
                </div>
              )}

              {/* Content Gaps */}
              {analysis.content_gaps && analysis.content_gaps.length > 0 && (
                <div className="cb-card">
                  <p className="t-label text-muted-foreground mb-3">📚 Content Gaps to Fill</p>
                  {analysis.content_gaps.slice(0, 3).map((gap: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                      <span className="text-sm">{gap}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Complaints */}
              {analysis.complaints && analysis.complaints.length > 0 && (
                <div className="cb-card">
                  <p className="t-label text-muted-foreground mb-3">⚠️ Issues to Fix</p>
                  {analysis.complaints.slice(0, 3).map((c: any, i: number) => (
                    <div key={i} className="mb-3 pb-3 border-b border-border/30 last:border-0 last:pb-0 last:mb-0">
                      <p className="text-sm font-medium mb-1">{c.complaint}</p>
                      <p className="text-xs text-muted-foreground">Fix: {c.fix}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Superfan Insights */}
              {analysis.superfan_insights && (
                <div className="cb-card">
                  <p className="t-label text-muted-foreground mb-3">🏆 Superfan Insights</p>
                  <p className="text-sm">{analysis.superfan_insights}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {analysis && <ShareInsight title="Comment Intelligence" value={`${analysis.emotion_breakdown?.idea || 0} ideas found`} subtitle={analysis.summary} />}
    </FeaturePage>
  );
}
