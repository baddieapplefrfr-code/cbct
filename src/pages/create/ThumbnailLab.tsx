import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Trophy, Columns, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface ThumbnailConcept {
  concept_name: string;
  background: string;
  focal_element: string;
  text_overlay: string;
  font_style: string;
  text_color: string;
  text_placement: string;
  emotion: string;
  why_clicks: string;
  ctr_score: number;
  target_viewer: string;
}

export default function ThumbnailLab() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [concepts, setConcepts] = useState<ThumbnailConcept[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function generate() {
    if (!title.trim()) return;
    setLoading(true);
    setConcepts([]);
    setLoadStep(0);

    try {
      setLoadStep(1);
      const result = await callGroq(
        "You are a world class YouTube thumbnail designer who has studied every viral thumbnail. Generate 3 completely different thumbnail concepts for this video. Each concept must be radically different in approach. For each concept provide in JSON format: concept_name, background (exact color and style), focal_element (main visual), text_overlay (exact words), font_style, text_color, text_placement, emotion (it triggers in viewer), why_clicks (why this gets clicks), ctr_score (out of 10), target_viewer (which type of viewer). Return JSON array of 3 concepts. Make each concept completely different targeting different psychological triggers: curiosity, fear of missing out, shock, desire.",
        `Video title: "${title}"\nDescription: ${description}\n\nGenerate 3 radically different thumbnail concepts.`
      );
      setLoadStep(2);

      const parsed = parseJsonFromResponse(result);
      if (Array.isArray(parsed)) {
        setConcepts(parsed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const emotionColors: Record<string, string> = {
    curiosity: "bg-primary/10 text-primary",
    shock: "bg-destructive/10 text-destructive",
    desire: "bg-success/10 text-success",
    fomo: "bg-warning/10 text-warning",
    fear: "bg-destructive/10 text-destructive",
  };

  function getEmotionBadge(emotion: string) {
    const lower = emotion.toLowerCase();
    for (const key of Object.keys(emotionColors)) {
      if (lower.includes(key)) return emotionColors[key];
    }
    return "bg-primary/10 text-primary";
  }

  return (
    <FeaturePage emoji="🎨" title="Thumbnail Lab" description="Generate 3 radically different thumbnail concepts for any video">
      {/* Input */}
      <div className="max-w-xl mx-auto space-y-3 mb-8">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Video title..."
          className="h-12 rounded-xl"
        />
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="One-line description of what the video is about..."
          className="rounded-xl min-h-[60px]"
        />
        <Button
          size="lg"
          className="w-full h-14 rounded-xl text-lg font-bold"
          onClick={generate}
          disabled={loading || !title.trim()}
        >
          <Palette className="mr-2 h-5 w-5" /> Generate 3 Concepts
        </Button>
      </div>

      {loading && (
        <LoadingSteps steps={["Analysing video concept...", "Designing thumbnail approaches...", "Scoring CTR predictions..."]} currentStep={loadStep} />
      )}

      {concepts.length > 0 && (
        <>
          {/* View toggle */}
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
            >
              <Columns className="mr-1.5 h-4 w-4" />
              {viewMode === "cards" ? "Compare View" : "Card View"}
            </Button>
          </div>

          {viewMode === "cards" ? (
            <div className="grid md:grid-cols-3 gap-4">
              {concepts.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-border bg-card overflow-hidden card-glow"
                >
                  {/* Color swatch header */}
                  <div className="h-24 flex items-center justify-center p-4" style={{
                    background: `linear-gradient(135deg, hsl(${(i * 120) % 360} 60% 20%), hsl(${(i * 120 + 60) % 360} 60% 15%))`
                  }}>
                    <p className="text-xl font-black text-center text-white">
                      {typeof c.text_overlay === 'string' ? c.text_overlay : JSON.stringify(c.text_overlay)}
                    </p>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-lg">{c.concept_name}</p>
                      {i === 0 && <Trophy className="h-4 w-4 text-primary" />}
                    </div>

                    <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${getEmotionBadge(typeof c.emotion === 'string' ? c.emotion : '')}`}>
                      {typeof c.emotion === 'string' ? c.emotion : JSON.stringify(c.emotion)}
                    </span>

                    {/* CTR Score */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">CTR Prediction</span>
                        <span className="font-bold text-primary">{c.ctr_score}/10</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${c.ctr_score * 10}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15 + 0.3 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {["background", "focal_element", "why_clicks", "target_viewer"].map(field => (
                        <div key={field}>
                          <p className="text-xs font-semibold text-muted-foreground capitalize">{field.replace(/_/g, " ")}</p>
                          <p className="text-xs">{typeof (c as any)[field] === 'string' ? (c as any)[field] : JSON.stringify((c as any)[field])}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(title)}`)}
                    >
                      This Is The One <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Table compare view */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Attribute</th>
                    {concepts.map((c, i) => (
                      <th key={i} className="p-3 text-left text-xs font-semibold">{c.concept_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["emotion", "text_overlay", "focal_element", "background", "ctr_score", "target_viewer"] as const).map(attr => (
                    <tr key={attr} className="border-b border-border">
                      <td className="p-3 text-xs text-muted-foreground capitalize">{attr.replace(/_/g, " ")}</td>
                      {concepts.map((c, i) => (
                        <td key={i} className="p-3 text-xs">{String((c as any)[attr])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </>
      )}
    </FeaturePage>
  );
}
