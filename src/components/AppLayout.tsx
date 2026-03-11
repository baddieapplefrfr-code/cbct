import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Zap, Eye, TrendingUp, Brain } from "lucide-react";
import ModeSwitcher, { type ModeId } from "@/components/ModeSwitcher";
import ContextSidebar from "@/components/ContextSidebar";
import { isChannelConnected } from "@/lib/youtube-api";

const mobileNav = [
  { label: "Diagnose", icon: AlertCircle, path: "/diagnose/video-death", color: "#f87171" },
  { label: "Create", icon: Zap, path: "/create/video-machine", color: "#60a5fa" },
  { label: "Spy", icon: Eye, path: "/strategy/competitor-spy", color: "#a78bfa" },
  { label: "Grow", icon: TrendingUp, path: "/grow/lightning-lab", color: "#4ade80" },
  { label: "Coach", icon: Brain, path: "/coach", color: "#facc15" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<ModeId>("diagnose");

  useEffect(() => {
    if (!isChannelConnected()) {
      navigate("/", { replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) return null;

  return (
    <div className="min-h-screen flex flex-col w-full">
      <ModeSwitcher onModeChange={setMode} />
      <div className="flex-1 flex min-h-0">
        <ContextSidebar mode={mode} />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-20 md:pb-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t md:hidden" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {mobileNav.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1 px-3 py-2"
          >
            <item.icon className="h-5 w-5" style={{ color: item.color }} />
            <span className="text-[10px] font-medium" style={{ color: item.color }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
