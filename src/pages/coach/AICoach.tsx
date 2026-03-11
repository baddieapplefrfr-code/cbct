import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Zap, MessageSquare, Heart, Swords, Trash2 } from "lucide-react";
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

const quickActions = [
  { label: "What should I post?", icon: Zap },
  { label: "Review my channel", icon: MessageSquare },
  { label: "I'm feeling burnt out", icon: Heart },
  { label: "Help me beat my competitor", icon: Swords },
];

export default function AICoach() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [channelContext, setChannelContext] = useState("");
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

      const greeting = await callAI(
        `You are Max, an elite YouTube growth coach. You have access to this creator's full channel data:\n${ctx}\n\nYou speak like a brilliant friend — direct, specific, encouraging but brutally honest. Never give generic advice. Every answer must reference their specific channel data.`,
        "Generate a short, personalized opening message for this creator. Reference their latest video performance. Be warm but insightful. 2-3 sentences max."
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
        `You are Max, an elite YouTube growth coach with deep knowledge of the algorithm, content strategy, and creator psychology. You have access to this creator's full channel data:\n${channelContext}\n\nYou know their wins and their struggles. You speak like a brilliant friend who genuinely cares — direct, specific, encouraging but brutally honest. Never give generic advice. Every answer must reference their specific channel data. Keep responses concise (3-5 sentences unless they ask for detail).`,
        `Conversation so far:\n${history}\n\nRespond to the creator's latest message.`
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
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
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
      <div className="px-6 py-4 border-t border-border bg-card/50 backdrop-blur-sm">
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
