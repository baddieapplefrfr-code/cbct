import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap, Sun, Moon, LogOut, Chrome } from "lucide-react";
import { isChannelConnected, clearChannelData, formatCount, type ChannelData } from "@/lib/youtube-api";
import { signInWithGoogle, isFullyConnected } from "@/lib/youtube-auth";
import AIStatusDot from "@/components/AIStatusDot";

const modes = [
  { id: "diagnose", label: "DIAGNOSE", color: "#f87171" },
  { id: "create", label: "CREATE", color: "#60a5fa" },
  { id: "grow", label: "GROW", color: "#4ade80" },
  { id: "coach", label: "COACH", color: "#facc15" },
] as const;

export type ModeId = typeof modes[number]["id"];

function getModeFromPath(path: string): ModeId {
  if (path.startsWith("/diagnose") || path === "/dashboard") return "diagnose";
  if (path.startsWith("/create")) return "create";
  if (path.startsWith("/grow") || path.startsWith("/analyze") || path.startsWith("/strategy")) return "grow";
  if (path.startsWith("/coach")) return "coach";
  return "diagnose";
}

interface ModeSwitcherProps {
  onModeChange: (mode: ModeId) => void;
}

export default function ModeSwitcher({ onModeChange }: ModeSwitcherProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<ModeId>(getModeFromPath(location.pathname));
  const [avatar, setAvatar] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [subCount, setSubCount] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("cb_theme") || "dark");
  const [connectLoading, setConnectLoading] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const mode = getModeFromPath(location.pathname);
    setActiveMode(mode);
    onModeChange(mode);
  }, [location.pathname]);

  useEffect(() => {
    const idx = modes.findIndex(m => m.id === activeMode);
    const el = tabRefs.current[idx];
    if (el) {
      setUnderlineStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isChannelConnected()) {
      try {
        const stored = localStorage.getItem("yt_channel_data");
        if (stored) {
          const data: ChannelData = JSON.parse(stored);
          setAvatar(data.avatar);
          setChannelName(data.name);
          setSubCount(formatCount(data.subscribers));
        }
      } catch {}
    }
  }, []);

  function handleModeClick(mode: ModeId) {
    setActiveMode(mode);
    onModeChange(mode);
    const defaultRoutes: Record<ModeId, string> = {
      diagnose: "/dashboard",
      create: "/create/video-machine",
      grow: "/grow/lightning-lab",
      coach: "/coach",
    };
    navigate(defaultRoutes[mode]);
  }

  async function handleGoogleConnect() {
    setConnectLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setConnectLoading(false);
      // Optionally show error toast here
    }
    // On success, browser redirects to /auth/callback
  }

  const activeColor = modes.find(m => m.id === activeMode)?.color || "#facc15";

  return (
    <header className="h-12 flex items-center justify-between border-b border-border/50 px-4 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.15)" }}>
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-bold hidden sm:inline font-display">CreatorBrain</span>
        </button>

        <nav className="relative flex items-center gap-1">
          {modes.map((mode, i) => (
            <button
              key={mode.id}
              ref={el => { tabRefs.current[i] = el; }}
              onClick={() => handleModeClick(mode.id)}
              className={`px-3 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                activeMode === mode.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={activeMode === mode.id ? { color: mode.color } : undefined}
            >
              {mode.label}
            </button>
          ))}
          <motion.div
            className="absolute bottom-0 h-[2px] rounded-full"
            animate={{ left: underlineStyle.left, width: underlineStyle.width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ background: activeColor }}
          />
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Show Connect button if not fully connected */}
        {!isFullyConnected() && isChannelConnected() && (
          <button
            onClick={handleGoogleConnect}
            disabled={connectLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(250,204,21,0.1)",
              border: "1px solid rgba(250,204,21,0.3)",
              color: "#facc15"
            }}
          >
            {connectLoading ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" style={{ borderTopColor: "transparent" }} />
            ) : (
              <Chrome className="h-3.5 w-3.5" />
            )}
            Unlock Full Analytics
          </button>
        )}

        {/* Show badge if connected */}
        {isFullyConnected() && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.3)"
            }}>
            <div className="h-2 w-2 rounded-full" style={{ background: "#4ade80" }} />
            <span className="text-[10px] font-bold" style={{ color: "#4ade80" }}>Private Analytics</span>
          </div>
        )}

        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <AIStatusDot />
        {avatar && (
          <div className="flex items-center gap-2">
            <img src={avatar} alt={channelName} className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
            <span className="text-xs text-muted-foreground hidden md:inline">{channelName}</span>
          </div>
        )}
        <button onClick={() => { clearChannelData(); navigate("/"); }} className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Disconnect">
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
