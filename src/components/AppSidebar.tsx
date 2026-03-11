import { motion } from "framer-motion";
import {
  Home, Bot,
  AlertTriangle, HeartPulse, TrendingDown, Map, CircleDot,
  Lightbulb, CheckCircle, Clock, Skull, Eye,
  Timer, Type, Sparkles, Brain,
  Activity, GitCompare, Star, Ghost, Film,
  MessageSquare, Copy, Users, BadgeDollarSign, Battery,
  Wand2, Flame, Palette, Radio, Handshake,
  TrendingUp, Zap as ZapIcon, Crown,
  ListOrdered, PenLine, Zap, Youtube,
  Gauge, CalendarDays, ChevronDown, Sun, Moon,
  BarChart3, Heart, BatteryCharging, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { isChannelConnected, clearChannelData, formatCount, type ChannelData } from "@/lib/youtube-api";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const MAX_VISIBLE = 5;

const nav = [
  { section: null, color: "", cssVar: "", items: [
    { title: "Dashboard", url: "/dashboard", icon: Home },
  ]},
  { section: "DIAGNOSE", color: "cat-diagnose", cssVar: "--cat-diagnose", items: [
    { title: "Why Did My Video Die?", url: "/diagnose/video-death", icon: AlertTriangle },
    { title: "Channel Roast", url: "/diagnose/roast", icon: Flame },
    { title: "Health Check", url: "/diagnose/health-check", icon: HeartPulse },
    { title: "Beat The Plateau", url: "/diagnose/plateau", icon: TrendingDown },
    { title: "Algorithm DNA", url: "/diagnose/algorithm-map", icon: Map },
    { title: "Growth Predictor", url: "/diagnose/growth-predictor", icon: CircleDot },
  ]},
  { section: "STRATEGY", color: "cat-strategy", cssVar: "--cat-strategy", items: [
    { title: "What To Make Next", url: "/strategy/next-video", icon: Lightbulb },
    { title: "Trend Radar", url: "/strategy/trend-radar", icon: Radio },
    { title: "Idea Validator", url: "/strategy/idea-validator", icon: CheckCircle },
    { title: "Viral Window", url: "/strategy/viral-window", icon: Clock },
    { title: "Competitor Spy", url: "/strategy/competitor-spy", icon: Eye },
    { title: "Topic Graveyard", url: "/strategy/topic-graveyard", icon: Skull },
    { title: "Series Planner", url: "/strategy/series-planner", icon: ListOrdered },
    { title: "Collab Script", url: "/strategy/collab-script", icon: PenLine },
  ]},
  { section: "CREATE", color: "cat-create", cssVar: "--cat-create", items: [
    { title: "Video Machine", url: "/create/video-machine", icon: Timer },
    { title: "Thumbnail Lab", url: "/create/thumbnail-lab", icon: Palette },
    { title: "Thumbnail Psychology", url: "/create/thumbnail-psychology", icon: Brain },
    { title: "Hook Analyser", url: "/create/hook-score", icon: Sparkles },
    { title: "Title Battle", url: "/create/title-tester", icon: Type },
    { title: "Title Psychology", url: "/create/title-psychology", icon: Wand2 },
    { title: "Script Surgeon", url: "/create/script-improver", icon: PenLine },
  ]},
  { section: "ANALYSE", color: "cat-analyze", cssVar: "--cat-analyze", items: [
    { title: "Video Analyser", url: "/analyze/video-analyser", icon: Film },
    { title: "War Room", url: "/analyze/war-room", icon: Activity },
    { title: "Format Battle", url: "/analyze/shorts-vs-longs", icon: GitCompare },
    { title: "Outlier Spotter", url: "/analyze/outliers", icon: Star },
    { title: "Dead Revival", url: "/analyze/revival", icon: Ghost },
    { title: "Comment Miner", url: "/analyze/comments", icon: MessageSquare },
    { title: "Best Time to Post", url: "/analyze/best-upload-time", icon: CalendarDays },
    { title: "Subscriber Converter", url: "/analyze/subscriber-converter", icon: BarChart3 },
    { title: "Sentiment Timeline", url: "/analyze/sentiment-timeline", icon: Heart },
    { title: "Viral Moments", url: "/analyze/viral-moments", icon: ZapIcon },
    { title: "Niche Authority", url: "/analyze/niche-authority", icon: Crown },
    { title: "Retention Predictor", url: "/analyze/retention-predictor", icon: Gauge },
  ]},
  { section: "GROW", color: "cat-grow", cssVar: "--cat-grow", items: [
    { title: "Recreate Best", url: "/grow/recreate-best", icon: Copy },
    { title: "Collab Matcher", url: "/grow/collab-matcher", icon: Handshake },
    { title: "Persona Builder", url: "/grow/persona", icon: Users },
    { title: "Sponsor Score", url: "/grow/sponsor", icon: BadgeDollarSign },
    { title: "30-Day Plan", url: "/grow/launch-plan", icon: CalendarDays },
    { title: "Burnout Mode", url: "/grow/burnout", icon: Battery },
    { title: "Content Battery", url: "/grow/content-battery", icon: BatteryCharging },
  ]},
  { section: "AI COACH", color: "cat-coach", cssVar: "--cat-coach", items: [
    { title: "Max AI Coach", url: "/coach", icon: Bot },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [subCount, setSubCount] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("cb_sidebar_expanded") || "{}"); } catch { return {}; }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("cb_theme") || "dark");
  const isConnected = isChannelConnected();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isConnected) {
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
  }, [isConnected]);

  useEffect(() => {
    localStorage.setItem("cb_sidebar_expanded", JSON.stringify(expanded));
  }, [expanded]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  function handleDisconnect() {
    clearChannelData();
    navigate("/", { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 sidebar-gradient">
      <SidebarContent className="scrollbar-thin py-3 flex flex-col h-full">
        {/* Logo */}
        <div className={`px-4 pb-3 mb-1 border-b border-border/30 ${collapsed ? "text-center" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div>
                <span className="text-sm font-bold text-foreground">CreatorBrain</span>
                <span className="text-[9px] text-muted-foreground ml-1.5 font-medium">v2.0</span>
              </div>
            )}
          </div>
        </div>

        {/* Creator avatar */}
        {avatar && (
          <div className={`px-4 py-3 mb-1 flex items-center gap-3 border-b border-border/30 ${collapsed ? "justify-center" : ""}`}>
            <img src={avatar} alt={channelName} className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30 shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{channelName}</p>
                {subCount && <p className="text-[11px] text-muted-foreground">{subCount} subs</p>}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {nav.map((group, gi) => {
            const showAll = expanded[gi] || group.items.length <= MAX_VISIBLE;
            const visibleItems = showAll ? group.items : group.items.slice(0, MAX_VISIBLE);
            const hasMore = group.items.length > MAX_VISIBLE;

            return (
              <SidebarGroup key={gi} className={gi > 0 ? "mt-0.5" : ""}>
                {group.section && (
                  <SidebarGroupLabel
                    className="t-label px-4 py-2 text-[10px]"
                    style={{ color: `hsl(var(${group.cssVar || "--muted-foreground"}))` }}
                  >
                    {collapsed ? group.section.charAt(0) : group.section}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      const active = location.pathname === item.url;
                      const catColor = group.cssVar || "--primary";
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className={`text-[13px] transition-all duration-150 rounded-lg px-3 py-2 relative group ${
                                active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                              }`}
                              activeClassName="text-foreground font-medium"
                              style={active ? { backgroundColor: `hsl(var(${catColor}) / 0.08)` } : undefined}
                            >
                              {active && (
                                <span
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                  style={{ backgroundColor: `hsl(var(${catColor}))`, boxShadow: `0 0 8px hsl(var(${catColor}) / 0.6)` }}
                                />
                              )}
                              <item.icon
                                className="mr-2.5 h-4 w-4 shrink-0 transition-colors"
                                style={active ? { color: `hsl(var(${catColor}))` } : undefined}
                              />
                              {!collapsed && <span className="truncate">{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    {hasMore && !collapsed && (
                      <SidebarMenuItem>
                        <button
                          onClick={() => setExpanded(p => ({ ...p, [gi]: !p[gi] }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${expanded[gi] ? "rotate-180" : ""}`} />
                          {expanded[gi] ? "Show less" : `${group.items.length - MAX_VISIBLE} more`}
                        </button>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="mt-auto pt-3 px-3 border-t border-border/30 space-y-1.5">
          {!collapsed && (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
            >
              <motion.div key={theme} initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.div>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          )}
          {isConnected && !collapsed && (
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Channel
            </button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
