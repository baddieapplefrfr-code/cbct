import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface TitleScore {
  title: string;
  curiosity_gap: number;
  emotional_trigger: number;
  keyword_strength: number;
  specificity: number;
  first_word_power: number;
  total: number;
  explanation: string;
}

export default function TitleTester() {
  const navigate = useNavigate();
  const [titles, setTitles] = useState(["", "", ""]);
  const [results, setResults] = useState<TitleScore[]>([]);
  const [betterTitles, setBetterTitles] = useState<string[]>([]);
  const [winner, setWinner] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
  }, []);

  async function battleTest() {
    const validTitles = titles.filter(t => t.trim());
    if (validTitles.length < 2) return;
    setLoading(true);
    setResults([]);
    setBetterTitles([]);
    setLoadStep(0);

    try {
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      setLoadStep(1);

      const context = getChannelContext(ch, vids);
      setLoadStep(2);

      const result = await callGroq(
        "You are a YouTube CTR expert. Analyse these title options against each other and against this channel's historical title performance. Score each title on: curiosity_gap (0-10), emotional_trigger (0-10), keyword_strength (0-10), specificity (0-10), first_word_power (0-10). Calculate total as sum. Predict which gets highest CTR and explain exactly why. Then generate 3 even better titles. Return JSON with: scores (array of {title, curiosity_gap, emotional_trigger, keyword_strength, specificity, first_word_power, total, explanation}), winner_index (0-based), better_titles (array of 3 strings).",
        `${context}\n\nTITLES TO COMPARE:\n${validTitles.map((t, i) => `${i + 1}. "${t}"`).join("\n")}`
      );

      const parsed = parseJsonFromResponse(result);
      if (parsed?.scores) {
        setResults(parsed.scores);
        setWinner(parsed.winner_index || 0);
      }
      if (parsed?.better_titles) {
        setBetterTitles(parsed.better_titles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const categories = ["curiosity_gap", "emotional_trigger", "keyword_strength", "specificity", "first_word_power"] as const;
  const categoryLabels: Record<string, string> = {
    curiosity_gap: "Curiosity Gap",
    emotional_trigger: "Emotional Trigger",
    keyword_strength: "Keyword Strength",
    specificity: "Specificity",
    first_word_power: "First Word Power",
  };

  return (
    <FeaturePage emoji="⚔️" title="Title Split Tester" description="Compare titles head-to-head with AI scoring">
      {/* Input */}
      <div className="space-y-3 mb-6 max-w-xl mx-auto">
        {titles.map((t, i) => (
          <Input
            key={i}
            value={t}
            onChange={e => { const n = [...titles]; n[i] = e.target.value; setTitles(n); }}
            placeholder={`Title option ${i + 1}...`}
            className="h-12 rounded-xl"
          />
        ))}
        <Button
          size="lg"
          className="w-full h-14 rounded-xl text-lg font-bold"
          onClick={battleTest}
          disabled={loading || titles.filter(t => t.trim()).length < 2}
        >
          <Swords className="mr-2 h-5 w-5" /> Battle Test
        </Button>
      </div>

      {loading && (
        <LoadingSteps steps={["Fetching channel data...", "Analysing title patterns...", "Scoring your titles..."]} currentStep={loadStep} />
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          {/* Winner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center"
          >
            <Trophy className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold uppercase text-primary mb-1">Winner</p>
            <p className="text-xl font-bold">{results[winner]?.title}</p>
            <p className="text-sm text-muted-foreground mt-2">{results[winner]?.explanation}</p>
          </motion.div>

          {/* Score cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-xl border bg-card p-5 ${i === winner ? "border-primary/30 ring-1 ring-primary/20" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm truncate flex-1">{r.title}</p>
                  {i === winner && <Trophy className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </div>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{categoryLabels[cat]}</span>
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${((r as any)[cat] || 0) * 10}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold w-4 text-right">{(r as any)[cat]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-black text-primary">{r.total}/50</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Better titles */}
          {betterTitles.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" /> AI-Generated Superior Titles
              </h3>
              <div className="space-y-3">
                {betterTitles.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm flex-1">{t}</p>
                    <CopyButton text={t} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </FeaturePage>
  );
}
