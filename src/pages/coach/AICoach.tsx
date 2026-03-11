import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Zap, MessageSquare, Heart, Swords, Trash2, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI } from "@/lib/ai-service";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChannelInfo {
  name: string;
  subscribers: number;
  bestDay?: string;
}

export default function AICoach() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [channelContext, setChannelContext] = useState("");
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions = channel ? [
    { label: `Why is my channel ${channel.subscribers > 100000 ? "plateauing" : "slow"}?`, icon: Zap },
    { label: `What should I post on ${channel.bestDay || "next"}?`, icon: MessageSquare },
    { label: "Roast my last video", icon: Flame },
    { label: "Give me my 30-day plan", icon: TrendingUp },
  ] : [
    { label: "What should I post?", icon: Zap },
    { label: "Review my channel", icon: MessageSquare },
    { label: "I'm feeling burnt out", icon: Heart },
    { label: "Help me beat my competitor", icon: Swords },
  ];

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    initCoach();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initCoach() {
    // Check for persisted chat history
    const saved = localStorage.getItem("cb_coach_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          // Still load channel context for future messages
          try {
            const ch = await getMyChannel();
            const vids = await getRecentVideos(ch.id, 10);
            setChannelContext(getChannelContext(ch, vids));
          } catch {}
          setInitializing(false);
          return;
        }
      } catch {}
    }

    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      const ctx = getChannelContext(ch, vids);
      setChannelContext(ctx);
      setChannel({ name: ch.name, subscribers: ch.subscribers, bestDay: ch.bestDay });

      const greeting = await callAI(
        `You are Max — the world's best YouTube growth coach. You are brilliant, direct, and speak like a trusted friend who happens to know everything about YouTube. You have this creator's full channel data: ${ctx}

Rules you never break:
- Every single response must reference their actual channel name, video titles, or real numbers
- Never give generic YouTube advice that could apply to anyone
- Always end with one specific action they can take TODAY
- If they're feeling burnt out or emotional, acknowledge it first before advising
- You are not a chatbot. You are their personal strategist who has studied their channel obsessively
- Maximum 4 sentences per response unless they ask for detail
- Use their bestDay and avgViews in every strategy recommendation`,
        "Generate a punchy 2-sentence opening. Sentence 1: Reference their most recent video by exact title and whether it over or underperformed. Sentence 2: Tell them the single most important thing you see in their channel data right now. Sound like a coach who already did their homework, not a chatbot saying hello."
      );
      const msgs: Message[] = [{ role: "assistant", content: greeting }];
      setMessages(msgs);
      localStorage.setItem("cb_coach_history", JSON.stringify(msgs));
    } catch (err) {
      const msgs: Message[] = [{ role: "assistant", content: "Hey! I'm Max, your AI growth coach. Connect your YouTube channel and I'll give you personalized advice based on your real data. What's on your mind?" }];
      setMessages(msgs);
      localStorage.setItem("cb_coach_history", JSON.stringify(msgs));
    } finally {
      setInitializing(false);
    }
  }

  function clearChat() {
    localStorage.removeItem("cb_coach_history");
    setMessages([]);
    setInitializing(true);
    initCoach();
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages.map(m => `${m.role === "user" ? "Creator" : "Max"}: ${m.content}`).join("\n\n");

      const response = await callAI(
        `You are Max — the world's best YouTube growth coach. You are brilliant, direct, and speak like a trusted friend who happens to know everything about YouTube. You have this creator's full channel data: ${channelContext}

Rules you never break:
- Every single response must reference their actual channel name, video titles, or real numbers
- Never give generic YouTube advice that could apply to anyone
- Always end with one specific action they can take TODAY
- If they're feeling burnt out or emotional, acknowledge it first before advising
- You are not a chatbot. You are their personal strategist who has studied their channel obsessively
- Maximum 4 sentences per response unless they ask for detail
- Use their bestDay and avgViews in every strategy recommendation

Conversation so far:\n${history}`,
        "Respond to the creator's latest message."
      );

      const updatedMessages = [...newMessages, { role: "assistant" as const, content: response }];
      setMessages(updatedMessages);
      localStorage.setItem("cb_coach_history", JSON.stringify(updatedMessages));
    } catch (err) {
      const updatedMessages = [...newMessages, { role: "assistant" as const, content: "Sorry, I had a moment there. Could you try again?" }];
      setMessages(updatedMessages);
      localStorage.setItem("cb_coach_history", JSON.stringify(updatedMessages));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold font-display">Max</p>
              <p className="text-xs text-muted-foreground">Your AI Growth Coach</p>
            </div>
            {loading && <div className="h-2 w-2 rounded-full bg-primary animate-pulse ml-2" />}
          </div>
          <button onClick={clearChat} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Clear chat">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {initializing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm">Max is reviewing your channel...</span>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`} style={m.role === "assistant" ? { borderLeft: "3px solid hsl(var(--primary) / 0.4)", paddingLeft: "12px" } : {}}>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm">🤖</span>
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages[messages.length - 1]?.role === "assistant" && !loading && (
            <div className="flex gap-2 flex-wrap px-4 pb-2">
              {["Tell me more", "Give me the action steps"].map(s => (
                <button key={s} onClick={() => { setInput(s); }} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-2">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Button key={a.label} variant="outline" size="sm" className="rounded-full" onClick={() => sendMessage(a.label)}>
                <a.icon className="mr-1.5 h-3.5 w-3.5" /> {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 p-4 backdrop-blur-md" style={{ background: "hsl(var(--background) / 0.8)", borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Max anything about your channel..."
            className="h-12 rounded-xl"
            inputMode="text"
            autoComplete="off"
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <Button size="lg" className="h-12 px-6 rounded-xl" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
