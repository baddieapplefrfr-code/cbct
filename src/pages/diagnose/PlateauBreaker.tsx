import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Calendar, CheckCircle, Clock, Video } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface PlateauAnalysis {
  plateau_type: string;
  root_cause: string;
  weeks: { week: number; focus: string; videos: { title: string; hook: string; best_day: string }[]; }[];
}

export default function PlateauBreaker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [analysis, setAnalysis] = useState<PlateauAnalysis | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 20);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);

      const result = await callGroq(
        `This creator is stuck in a growth plateau. Their niche is productivity and tech. Create a 4-week breakout plan with YouTube-specific video topics for their niche. Each week has a strategic theme. Week 1 = Optimise existing content, Week 2 = Trend-driven content, Week 3 = Deep engagement content, Week 4 = Collaboration and reach. Return JSON: {plateau_type: string, root_cause: string, weeks: [{week: number, focus: string, videos: [{title: string (real YouTube title for tech/productivity), hook: string (first line of script), best_day: string}]}]}. Each week must have exactly 3 videos. Titles must be specific YouTube video titles for a tech/productivity creator, NOT generic lifestyle content.`,
        `${context}\n\nDiagnose and create a breakout plan.`
      );

      const parsed = parseJsonFromResponse(result);
      if (parsed) {
        // Normalize videos to objects if they came back as strings
        if (parsed.weeks) {
          parsed.weeks = parsed.weeks.map((w: any) => ({
            ...w,
            videos: (w.videos || []).map((v: any) =>
              typeof v === "string" ? { title: v, hook: "", best_day: "Saturday" } : v
            ),
          }));
        }
        setAnalysis(parsed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const weekThemes = ["🔧 Optimise", "📈 Trends", "💬 Engage", "🤝 Reach"];
  const weekColors = [
    { bg: "hsl(var(--cat-diagnose) / 0.1)", border: "hsl(var(--cat-diagnose) / 0.3)", text: "hsl(var(--cat-diagnose))" },
    { bg: "hsl(var(--cat-strategy) / 0.1)", border: "hsl(var(--cat-strategy) / 0.3)", text: "hsl(var(--cat-strategy))" },
    { bg: "hsl(var(--cat-analyze) / 0.1)", border: "hsl(var(--cat-analyze) / 0.3)", text: "hsl(var(--cat-analyze))" },
    { bg: "hsl(var(--cat-grow) / 0.1)", border: "hsl(var(--cat-grow) / 0.3)", text: "hsl(var(--cat-grow))" },
  ];

  const totalTasks = analysis?.weeks?.reduce((s, w) => s + (w.videos?.length || 0), 0) || 0;
  const completedTasks = Object.values(checked).filter(Boolean).length;

  if (loading) {
    return (
      <FeaturePage emoji="📉" title="Growth Plateau Breaker" description="Detect plateau patterns and get a 30-day breakout plan">
        <LoadingSteps steps={["Analysing growth patterns...", "Identifying plateau type...", "Building breakout plan..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="📉" title="Growth Plateau Breaker" description="Detect plateau patterns and get a 30-day breakout plan">
      {analysis && (
        <div className="space-y-8">
          {/* Plateau Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
            <div className="cb-card inline-flex items-center gap-3 px-8 py-4" style={{ borderColor: 'hsl(var(--destructive) / 0.3)' }}>
              <TrendingDown className="h-7 w-7 text-destructive" />
              <div>
                <p className="t-label text-destructive">PLATEAU TYPE</p>
                <p className="text-xl font-bold mt-0.5">{analysis.plateau_type}</p>
              </div>
            </div>
            <p className="t-body text-center max-w-md">{analysis.root_cause}</p>
          </motion.div>

          {/* Progress */}
          <div className="cb-card">
            <div className="flex items-center justify-between mb-3">
              <p className="section-header">📋 30-Day Progress</p>
              <span className="data-number text-2xl">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                className="h-full bg-primary rounded-full"
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Kanban Board */}
          <div>
            <h2 className="section-header flex items-center gap-2 mb-5">
              <Calendar className="h-5 w-5 text-primary" /> Content Calendar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysis.weeks?.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="cb-card flex flex-col !p-0 overflow-hidden"
                >
                  {/* Column Header */}
                  <div
                    className="p-4 border-b"
                    style={{
                      backgroundColor: weekColors[i]?.bg,
                      borderColor: weekColors[i]?.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="t-label" style={{ color: weekColors[i]?.text }}>
                        Week {week.week}
                      </span>
                      <span className="text-sm">{weekThemes[i]}</span>
                    </div>
                    <p className="t-card-title mt-1 text-sm">{week.focus}</p>
                  </div>

                  {/* Video Cards */}
                  <div className="p-3 space-y-2 flex-1">
                    {week.videos?.map((vid, j) => {
                      const key = `${i}-${j}`;
                      const done = checked[key];
                      const video = typeof vid === "string" ? { title: vid, hook: "", best_day: "" } : vid;
                      return (
                        <div
                          key={j}
                          onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}
                          className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                            done
                              ? "border-success/30 bg-success/5 opacity-70"
                              : "border-border bg-background hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              done ? "bg-success border-success" : "border-muted-foreground/30"
                            }`}>
                              {done && <CheckCircle className="h-2.5 w-2.5 text-black" />}
                            </div>
                            <div className="min-w-0">
                              <span className={`text-xs font-medium leading-snug block ${done ? "line-through text-muted-foreground" : ""}`}>
                                {video.title}
                              </span>
                              {video.hook && (
                                <p className="text-[10px] text-muted-foreground mt-1 italic">"{video.hook}"</p>
                              )}
                              {video.best_day && (
                                <span className="text-[10px] text-muted-foreground mt-1 inline-block">📅 {video.best_day}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
