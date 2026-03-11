import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";
import CopyButton from "@/components/CopyButton";

export default function ThumbnailStudio() {
  const { channelContext } = useChannelData();
  const [tab, setTab] = useState("analyse");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function analyse() {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await callAI(
        "Analyse this YouTube thumbnail concept. Return JSON: { ctr_prediction: number (1-10), verdict: string, eye_flow: [string], five_second_test: string, emotion_triggered: string, contrast_score: number, text_readability: number, improvements: [{priority: number, change: string, reason: string}], redesign_concepts: [{name: string, emotion: string, predicted_ctr: number, why_it_works: string}] }",
        `Thumbnail description: ${description}\n\nChannel context: ${channelContext}`
      );
      setData(parseJsonFromAI(res));
    } catch {}
    setLoading(false);
  }

  return (
    <FeaturePage emoji="🖼" title="Thumbnail Studio" description="Analyse, preview, and improve your thumbnails">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="analyse" className="space-y-6">
          <div className="space-y-3">
            <Input placeholder="Describe your thumbnail concept..." value={description} onChange={e => setDescription(e.target.value)} className="h-12" />
            <Button onClick={analyse} disabled={loading} className="w-full" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              {loading ? "Analysing..." : "Analyse Thumbnail"}
            </Button>
          </div>

          {data && (
            <div className="space-y-6">
              {/* Layer 1 */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <p className="data-number-xl" style={{ fontSize: "52px", fontWeight: 800, color: "hsl(var(--primary))" }}>{data.ctr_prediction}/10</p>
                <p className="text-lg text-muted-foreground mt-2">{data.verdict}</p>
                <div className="flex justify-center gap-3 mt-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>Contrast: {data.contrast_score}/10</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>Readability: {data.text_readability}/10</span>
                </div>
              </motion.div>

              {/* Eye flow */}
              {data.eye_flow && (
                <div className="cb-card">
                  <p className="t-label text-muted-foreground mb-2">Eye Flow</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {data.eye_flow.map((point: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>{i+1}</span>
                        <span className="text-sm">{point}</span>
                        {i < data.eye_flow.length - 1 && <span className="text-muted-foreground">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5 second test */}
              <div className="cb-card">
                <p className="t-label text-muted-foreground mb-1">5-Second Test</p>
                <p className="text-sm">{data.five_second_test}</p>
              </div>

              {/* Improvements */}
              {data.improvements && (
                <div className="space-y-2">
                  <h3 className="t-label text-muted-foreground">Improvements</h3>
                  {data.improvements.map((imp: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary">#{imp.priority}</span>
                        <p className="text-sm font-semibold">{imp.change}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{imp.reason}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-2xl mb-2">📱 🖥 🔍</p>
            <p className="text-muted-foreground">Upload a thumbnail to see it in Mobile, Desktop, and Search contexts</p>
            <p className="text-xs text-muted-foreground mt-2">Coming soon — describe your concept in the Analyse tab for now</p>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          {data?.redesign_concepts ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {data.redesign_concepts.map((c: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="cb-card space-y-2">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.emotion}</p>
                  <p className="text-lg font-bold text-primary">{c.predicted_ctr}/10 CTR</p>
                  <p className="text-xs text-muted-foreground">{c.why_it_works}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">Analyse a thumbnail first to generate concepts</p>
          )}
        </TabsContent>
      </Tabs>
    </FeaturePage>
  );
}
