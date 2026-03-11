import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wand2, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface ScriptResult {
  improved_script: string;
  changes: { original: string; improved: string; reason: string }[];
  readability_before: number;
  readability_after: number;
  retention_improvement: string;
  top_3_fixes: string[];
}

export default function ScriptImprover() {
  const navigate = useNavigate();
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<ScriptResult | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function improve() {
    if (!script.trim()) return;
    setLoading(true);
    setResult(null);
    setLoadStep(0);

    try {
      setTimeout(() => setLoadStep(1), 1500);
      setTimeout(() => setLoadStep(2), 3000);

      const res = await callGroq(
        `You are a master storyteller and YouTube scriptwriter. Improve this script dramatically. Fix pacing, remove filler, add pattern interrupts every 90 seconds, strengthen storytelling, improve CTA, add curiosity gaps. Return JSON: {improved_script: string, changes: [{original: string, improved: string, reason: string}], readability_before: number, readability_after: number, retention_improvement: string, top_3_fixes: [string]}`,
        `SCRIPT TO IMPROVE:\n\n${script}\n\nOperate on this script.`
      );

      const parsed = parseJsonFromResponse(res);
      if (parsed) setResult(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportText() {
    if (!result) return;
    const blob = new Blob([result.improved_script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "improved-script.txt";
    a.click();
  }

  return (
    <FeaturePage emoji="✂️" title="Script Surgeon" description="My scripts feel boring when I read them back but I don't know how to fix them.">
      {!result ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <Textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Paste your full script here..." className="min-h-[200px] rounded-xl" />
          <Button size="lg" className="w-full h-14 rounded-xl text-lg font-bold" onClick={improve} disabled={loading || !script.trim()}>
            <Wand2 className="mr-2 h-5 w-5" /> Operate
          </Button>
          {loading && (
            <LoadingSteps steps={["Analysing script structure...", "Identifying pacing issues...", "Rewriting for retention..."]} currentStep={loadStep} />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Readability</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-lg font-bold text-muted-foreground">{result.readability_before}</span>
                <ArrowUpRight className="h-4 w-4 text-success" />
                <span className="text-lg font-bold text-success">{result.readability_after}</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-success/20 bg-success/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">Est. Retention Boost</p>
              <p className="text-lg font-bold text-success mt-1">{result.retention_improvement}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Changes Made</p>
              <p className="text-lg font-bold mt-1">{result.changes?.length || 0}</p>
            </motion.div>
          </div>

          {/* Top 3 Fixes */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-semibold uppercase text-primary mb-3">Top 3 Problems Fixed</p>
            {result.top_3_fixes?.map((fix, i) => (
              <p key={i} className="text-sm mb-1">• {fix}</p>
            ))}
          </div>

          {/* Improved Script */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Improved Script</h3>
              <div className="flex gap-2">
                <CopyButton text={result.improved_script} />
                <Button variant="outline" size="sm" onClick={exportText}><Download className="mr-1 h-3 w-3" /> Export</Button>
              </div>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">{result.improved_script}</pre>
          </div>

          {/* Change Log */}
          <div className="space-y-3">
            <h3 className="font-semibold">Change Log</h3>
            {result.changes?.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="rounded-lg border border-border bg-card p-4">
                <div className="grid md:grid-cols-2 gap-3 mb-2">
                  <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-semibold text-destructive mb-1">Original</p>
                    <p className="text-xs">{c.original}</p>
                  </div>
                  <div className="p-2 rounded bg-success/5 border border-success/10">
                    <p className="text-xs font-semibold text-success mb-1">Improved</p>
                    <p className="text-xs">{c.improved}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">💡 {c.reason}</p>
              </motion.div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={() => { setResult(null); setScript(""); }}>
            Improve Another Script
          </Button>
        </div>
      )}
    </FeaturePage>
  );
}
