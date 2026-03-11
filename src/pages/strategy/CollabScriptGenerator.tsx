import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PenLine, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, searchChannel, getChannelById, getChannelVideos, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface CollabScript {
  video_concept: string;
  why_it_works: string;
  pitch_email: string;
  video_outline: string[];
  expected_views: string;
  title_options: string[];
}

export default function CollabScriptGenerator() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [script, setScript] = useState<CollabScript | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function generate() {
    if (!query.trim()) return;
    setLoading(true);
    setScript(null);
    setLoadStep(0);

    try {
      const ch = await getMyChannel();
      const myVids = await getRecentVideos(ch.id, 10);
      setLoadStep(1);

      const compId = await searchChannel(query);
      const comp = compId ? await getChannelById(compId) : null;
      const compVids = compId ? await getChannelVideos(compId, 10) : [];
      setLoadStep(2);

      const myContext = getChannelContext(ch, myVids);
      const compContext = comp ? `Partner: ${comp.title}, ${formatCount(comp.subscriberCount)} subs\nVideos: ${compVids.map(v => `"${v.title}"`).join(", ")}` : `Partner channel: ${query}`;

      const result = await callGroq(
        "Create a perfect collab pitch and video concept for these two channels. Return JSON: {video_concept: string, why_it_works: string, pitch_email: string (full professional email ready to send), video_outline: [array of 6-8 section strings], expected_views: string, title_options: [3 title options]}",
        `${myContext}\n\n${compContext}\n\nWrite the collab pitch and video concept.`
      );
      const parsed = parseJsonFromResponse(result);
      if (parsed) setScript(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const s = (v: any) => typeof v === "string" ? v : JSON.stringify(v);

  return (
    <FeaturePage emoji="🤝" title="Collab Script Generator" description="AI writes the perfect collab pitch and video concept">
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex gap-3">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter collab partner's channel name..." className="h-12 rounded-xl" onKeyDown={e => e.key === "Enter" && generate()} />
          <Button size="lg" className="h-12 px-6 rounded-xl" onClick={generate} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PenLine className="mr-2 h-4 w-4" /> Generate</>}
          </Button>
        </div>
      </div>

      {loading && <LoadingSteps steps={["Loading your channel...", "Analysing partner channel...", "Writing collab script..."]} currentStep={loadStep} />}

      {script && (
        <div className="space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <h3 className="section-header mb-2">🎬 Video Concept</h3>
            <p className="text-lg font-medium mb-3">{s(script.video_concept)}</p>
            <p className="text-sm text-muted-foreground">{s(script.why_it_works)}</p>
            <p className="data-number mt-3">{s(script.expected_views)} predicted views</p>
          </div>

          {/* Title Options */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="section-header mb-3">📝 Title Options</h3>
            <div className="space-y-2">
              {script.title_options?.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3">
                  <p className="font-medium">{s(t)}</p>
                  <CopyButton text={s(t)} />
                </div>
              ))}
            </div>
          </div>

          {/* Video Outline */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="section-header mb-3">📋 Video Outline</h3>
            <div className="space-y-2">
              {script.video_outline?.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="data-number text-lg w-6 text-center shrink-0">{i + 1}</span>
                  <p className="text-sm">{s(step)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pitch Email */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-header flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Ready-to-Send Pitch</h3>
              <CopyButton text={s(script.pitch_email)} />
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground bg-secondary/30 rounded-lg p-4">{s(script.pitch_email)}</pre>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
