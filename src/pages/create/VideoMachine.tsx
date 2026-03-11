import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, ChevronDown, ChevronUp, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FeaturePage from "@/components/FeaturePage";
import CopyButton from "@/components/CopyButton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { streamAI } from "@/lib/ai-service";

const SECTIONS = [
  { key: "hook", label: "🎣 Hook Script (First 60 Seconds)" },
  { key: "script", label: "📝 Full Script" },
  { key: "titles", label: "🔤 Title Options" },
  { key: "thumbnail", label: "🖼️ Thumbnail Brief" },
  { key: "description", label: "📋 SEO Description" },
  { key: "tags", label: "🏷️ Optimised Tags" },
  { key: "comment", label: "💬 Pinned Comment" },
  { key: "endscreen", label: "🎬 End Screen Script" },
];

export default function VideoMachine() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0); // 0 = input, 1 = generating, 2 = done

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true);
    setOutput("");
    setStep(1);

    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      const context = getChannelContext(ch, vids);

      await streamAI(
        `You are an expert YouTube scriptwriter. Create a complete video package for this topic optimised for this creator's specific channel and audience. Generate in this exact order:

## 🎣 Hook Script (First 60 Seconds)
(word for word, gripping, no fluff)

## 📝 Full Script
(with section headers and estimated timestamps)

## 🔤 Title Options
(5 titles ranked by predicted CTR with explanation)

## 🖼️ Thumbnail Brief
(emotion, focal point, text overlay, color palette)

## 📋 SEO Description
(with keywords)

## 🏷️ Optimised Tags
(20 tags)

## 💬 Pinned Comment
(to boost engagement)

## 🎬 End Screen Script

Make everything specific to this creator's voice and niche.`,
        `${context}\n\nTOPIC: ${topic}\n\nGenerate the complete video package now.`,
        (chunk) => {
          setOutput(prev => prev + chunk);
        }
      );
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  function exportAsText() {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-machine-${topic.slice(0, 30)}.txt`;
    a.click();
  }

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Split output into sections
  const sections = output.split(/## /).filter(Boolean).map(s => {
    const lines = s.split("\n");
    const title = lines[0]?.trim();
    const content = lines.slice(1).join("\n").trim();
    return { title, content };
  });

  return (
    <FeaturePage emoji="⚡" title="60-Minute Video Machine" description="Enter a topic. Watch AI build your complete video package in real time.">
      {step === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <div className="space-y-4">
            <Input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter your video topic..."
              className="h-14 text-lg rounded-xl"
              onKeyDown={e => e.key === "Enter" && generate()}
            />
            <Button
              size="lg"
              className="w-full h-14 rounded-xl text-lg font-bold"
              onClick={generate}
              disabled={!topic.trim()}
            >
              <Zap className="mr-2 h-5 w-5" /> Generate Everything
            </Button>
          </div>
        </motion.div>
      )}

      {(step === 1 || step === 2) && (
        <div className="space-y-4">
          {step === 2 && (
            <div className="flex gap-3 mb-6">
              <Button variant="outline" onClick={exportAsText}>
                <Download className="mr-2 h-4 w-4" /> Export as Text
              </Button>
              <Button variant="outline" onClick={() => { setStep(0); setOutput(""); }}>
                New Topic
              </Button>
            </div>
          )}

          {/* Live streaming output */}
          <div className="rounded-xl border border-border bg-card p-6">
            {sections.length > 0 ? (
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                      onClick={() => toggleSection(String(i))}
                    >
                      <span className="font-semibold">{section.title}</span>
                      <div className="flex items-center gap-2">
                        <CopyButton text={section.content} />
                        {expanded[String(i)] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {(expanded[String(i)] !== false) && (
                      <div className="px-4 pb-4">
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-sans">{section.content}</pre>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Generating your video package...</span>
              </div>
            )}

            {generating && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">AI is writing...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
