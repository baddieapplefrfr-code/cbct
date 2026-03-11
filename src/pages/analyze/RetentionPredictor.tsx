import { useState } from "react";
import { motion } from "framer-motion";
import { Gauge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FeaturePage from "@/components/FeaturePage";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { isChannelConnected } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface Prediction {
  ctr: number;
  avg_view_duration: number;
  like_rate: number;
  single_change: string;
}

function GaugeMeter({ value, label, color }: { value: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <p className="t-label text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

export default function RetentionPredictor() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [thumbDesc, setThumbDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); }
  }, []);

  async function predict() {
    if (!title.trim()) return;
    setLoading(true);
    setPrediction(null);
    try {
      const res = await callGroq(
        `You are a YouTube retention analyst. Given a video title and thumbnail description, predict performance metrics. Return JSON: {ctr: number (expected CTR percentage 1-15), avg_view_duration: number (expected average view duration percentage 20-80), like_rate: number (expected like rate percentage 1-10), single_change: string (the ONE change that would most improve retention)}`,
        `Title: "${title}"\nThumbnail description: "${thumbDesc || 'Not provided'}"\n\nPredict the retention metrics.`
      );
      const parsed = parseJsonFromResponse(res);
      if (parsed) setPrediction(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FeaturePage emoji="🎯" title="Retention Predictor" description="Predict CTR, view duration, and like rate before you publish">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="cb-card space-y-4">
          <div>
            <label className="t-label text-muted-foreground mb-2 block">VIDEO TITLE</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. I Deleted Social Media for 30 Days"
              className="h-12"
            />
          </div>
          <div>
            <label className="t-label text-muted-foreground mb-2 block">THUMBNAIL DESCRIPTION</label>
            <Textarea
              value={thumbDesc}
              onChange={e => setThumbDesc(e.target.value)}
              placeholder="e.g. Face showing shock, phone with X over social media icons, dark background"
              rows={3}
            />
          </div>
          <Button onClick={predict} disabled={loading || !title.trim()} className="w-full h-12">
            {loading ? "Predicting..." : "Predict Retention"}
            {!loading && <Sparkles className="ml-2 h-4 w-4" />}
          </Button>
        </div>

        {prediction && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="cb-card flex items-center justify-around py-8">
              <GaugeMeter value={prediction.ctr} label="EXPECTED CTR" color="hsl(var(--success))" />
              <GaugeMeter value={prediction.avg_view_duration} label="AVG VIEW DURATION" color="hsl(var(--info))" />
              <GaugeMeter value={prediction.like_rate} label="LIKE RATE" color="hsl(var(--primary))" />
            </div>
            <div className="cb-card-glow p-6">
              <p className="t-section text-primary mb-2">⚡ ONE CHANGE TO BOOST RETENTION</p>
              <p className="text-sm font-medium leading-relaxed">{prediction.single_change}</p>
            </div>
          </motion.div>
        )}
      </div>
    </FeaturePage>
  );
}
