import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tipSets: Record<string, string[]> = {
  competitor: [
    "MrBeast tests 50+ thumbnails before every upload",
    "Channels that post Tuesday–Thursday get 23% more views",
    "The first 30 seconds determine 70% of your retention",
    "Infiltrating competitor channel...",
    "Scanning their weakest videos...",
    "Calculating your unfair advantage...",
    "Top creators spend 3x more time on titles than scripts",
    "Videos under 8 mins get recommended 40% more often",
  ],
  channel: [
    "Analysing your upload patterns...",
    "Reading between the comment lines...",
    "Your audience is trying to tell you something...",
    "Channels that reply to comments grow 2x faster",
    "The algorithm rewards consistency over quality",
    "Building your growth intelligence...",
  ],
  ai: [
    "AI is reading your channel DNA...",
    "Cross-referencing 847 growth patterns...",
    "Running competitive simulation...",
    "Calculating your next viral video...",
    "Consulting the YouTube algorithm oracle...",
  ],
  default: [
    "Good things take a second...",
    "Crunching real YouTube data...",
    "Almost there...",
    "Preparing your insights...",
  ],
};

interface GameLoaderProps {
  progress: number;
  type?: keyof typeof tipSets;
  message?: string;
}

export default function GameLoader({ progress, type = "default", message }: GameLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const tips = tipSets[type] || tipSets.default;

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % tips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Bouncing dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className="h-3 w-3 rounded-full bg-primary"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* Current action */}
      {message && (
        <p className="text-sm font-medium text-foreground animate-pulse">{message}</p>
      )}

      {/* Progress bar */}
      <div className="w-64 space-y-2">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">{progress}%</p>
      </div>

      {/* Rotating tips */}
      <div className="h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-muted-foreground text-center italic"
          >
            💡 {tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
