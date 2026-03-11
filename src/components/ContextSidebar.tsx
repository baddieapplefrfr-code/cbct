import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FULL_CONNECT_FEATURES } from "@/lib/youtube-auth";
import type { ModeId } from "./ModeSwitcher";
import {
  AlertTriangle, Flame, HeartPulse, TrendingUp, Dna, Home,
  Timer, Sparkles, Type, Palette, PenLine, Radio,
  Lightbulb, Eye, Target, CheckCircle, Clock, Ghost, BadgeDollarSign, Handshake, Battery,
  Bot, MessageSquare, Users, CalendarDays, Lock, BarChart3, Zap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

const sidebarItems: Record<ModeId, NavItem[]> = {
  diagnose: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Why Did My Video Die", url: "/diagnose/video-death", icon: AlertTriangle },
    { title: "Channel Roast", url: "/diagnose/roast", icon: Flame },
    { title: "Health Check", url: "/diagnose/health-check", icon: HeartPulse },
    { title: "Growth Intelligence", url: "/diagnose/growth-intelligence", icon: TrendingUp },
    { title: "Algorithm Intelligence", url: "/diagnose/algorithm-intelligence", icon: Dna },
  ],
  create: [
    { title: "Video Machine", url: "/create/video-machine", icon: Timer },
    { title: "Hook Analyser", url: "/create/hook-score", icon: Sparkles },
    { title: "Title Battle", url: "/create/title-tester", icon: Type },
    { title: "Thumbnail Studio", url: "/create/thumbnail-studio", icon: Palette },
    { title: "Script Surgeon", url: "/create/script-improver", icon: PenLine },
    { title: "Teleprompter", url: "/create/teleprompter", icon: Radio },
  ],
  grow: [
    { title: "Lightning Lab", url: "/grow/lightning-lab", icon: Lightbulb },
    { title: "Competitor Spy", url: "/strategy/competitor-spy", icon: Eye },
    { title: "Niche Gap Radar", url: "/grow/niche-gap", icon: Target },
    { title: "Idea Validator", url: "/strategy/idea-validator", icon: CheckCircle },
    { title: "Viral Window", url: "/strategy/viral-window", icon: Clock },
    { title: "Hidden Gold", url: "/grow/hidden-gold", icon: Ghost },
    { title: "Sponsor Score", url: "/grow/sponsor", icon: BadgeDollarSign },
    { title: "Collab Matcher", url: "/grow/collab-matcher", icon: Handshake },
    { title: "Content Battery", url: "/grow/content-battery", icon: Battery },
  ],
  coach: [
    { title: "Max — AI Coach", url: "/coach", icon: Bot },
    { title: "Comment Intelligence", url: "/grow/comment-intelligence", icon: MessageSquare },
    { title: "Audience Intelligence", url: "/grow/audience-intelligence", icon: Users },
    { title: "30-Day Plan", url: "/grow/launch-plan", icon: CalendarDays },
  ],
};

const modeColors: Record<ModeId, string> = {
  diagnose: "--cat-diagnose",
  create: "--cat-create",
  grow: "--cat-grow",
  coach: "--cat-coach",
};

interface ContextSidebarProps {
  mode: ModeId;
}

export default function ContextSidebar({ mode }: ContextSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = sidebarItems[mode] || [];
  const colorVar = modeColors[mode];

  const isLocked = (url: string) => {
    return FULL_CONNECT_FEATURES.some(f => url.startsWith(f));
  };

  return (
    <aside className="w-52 shrink-0 border-r border-border/30 h-full overflow-y-auto scrollbar-thin py-3 hidden md:block" style={{ background: "hsl(var(--sidebar-background))" }}>
      {/* START HERE — first visit only */}
      {!localStorage.getItem("cb_onboarded") && (
        <div className="px-3 mb-4 pb-3 border-b border-border/30">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#facc15" }}>⚡ START HERE</p>
          {[
            { label: "Spy on a Competitor", path: "/strategy/competitor-spy", color: "#a78bfa" },
            { label: "Why Did My Video Die", path: "/diagnose/video-death", color: "#f87171" },
            { label: "What To Make Next", path: "/create/video-machine", color: "#60a5fa" },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); localStorage.setItem("cb_onboarded", "true"); }}
              className="w-full text-left text-xs font-medium px-3 py-2 rounded-lg mb-1 transition-colors hover:bg-accent/50"
              style={{ color: item.color }}
            >
              → {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="px-3 space-y-0.5">
        {items.map((item, i) => {
          const active = location.pathname === item.url;
          const locked = isLocked(item.url);
          
          const button = (
            <motion.button
              key={item.url}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !locked && navigate(item.url)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative ${
                active ? "text-foreground font-medium" : locked ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              style={active ? { backgroundColor: `hsl(var(${colorVar}) / 0.08)` } : undefined}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ backgroundColor: `hsl(var(${colorVar}))`, boxShadow: `0 0 8px hsl(var(${colorVar}) / 0.6)` }}
                />
              )}
              <item.icon
                className="h-4 w-4 shrink-0"
                style={active ? { color: `hsl(var(${colorVar}))` } : locked ? { opacity: 0.5 } : undefined}
              />
              <span className="truncate flex-1">{item.title}</span>
              {locked && <Lock className="h-3 w-3 shrink-0 opacity-50" />}
            </motion.button>
          );

          if (locked) {
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> Coming Soon — requires Full Connect
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </div>
    </aside>
  );
}
