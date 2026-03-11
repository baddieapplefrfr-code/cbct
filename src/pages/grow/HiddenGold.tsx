import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";
import { formatCount } from "@/lib/youtube-api";
import ShareInsight from "@/components/ShareInsight";
import CopyButton from "@/components/CopyButton";

export default function HiddenGold() {
  const { channel, videos, loading: dataLoading, channelContext, avgViews } = useChannelData();
  const [tab, setTab] = useState("shorts");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (channel && videos.length > 0 && !data) analyse(); }, [channel, videos]);

  async function analyse() {
    setLoading(true); setStep(0);
    try {
      setStep(1);
      const res = await callAI(
        "You are a YouTube content strategist. Analyse these videos for: 1) Shorts opportunities, 2) Dead videos that can be revived, 3) Viral moments. Return JSON: { shorts: [{video_title: string, timestamp: string, quote: string, viral_score: number, suggested_title: string}], dead_revival: [{title: string, views: number, new_title: string, revival_score: number, strategy: string}], viral_moments: [{video_title: string, timestamp: string, quote: string, potential: number, short_title: string}] }",
        channelContext
      );
      setStep(2);
      setData(parseJsonFromAI(res));
    } catch {}
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="💀" title="Hidden Gold" description="Shorts, revivals, and viral moments hiding in your content">
        <LoadingSteps steps={["Scanning content...", "Finding opportunities...", "Done"]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="💀" title="Hidden Gold" description="Shorts, revivals, and viral moments hiding in your content">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="shorts">Shorts Opportunities</TabsTrigger>
          <TabsTrigger value="revival">Dead Revival</TabsTrigger>
          <TabsTrigger value="viral">Viral Moments</TabsTrigger>
        </TabsList>

        <TabsContent value="shorts" className="space-y-3">
          {data?.shorts?.map((s: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.video_title}</p>
                <span className="text-xs font-bold text-primary">{s.timestamp}</span>
              </div>
              <p className="text-sm italic">"{s.quote}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                    <div className="h-full rounded-full bg-primary bar-animate" style={{ width: `${s.viral_score}%` }} />
                  </div>
                  <span className="text-xs font-bold">{s.viral_score}/100</span>
                </div>
                <CopyButton text={s.suggested_title} />
              </div>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--info))" }}>Title: "{s.suggested_title}"</p>
            </motion.div>
          )) || <p className="text-muted-foreground text-center py-8">No shorts opportunities found</p>}
        </TabsContent>

        <TabsContent value="revival" className="space-y-3">
          {data?.dead_revival?.map((d: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold line-through text-muted-foreground">{d.title}</p>
                <span className="text-xs text-muted-foreground">{formatCount(d.views)} views</span>
              </div>
              <p className="text-sm font-semibold text-success">→ {d.new_title}</p>
              <p className="text-xs text-muted-foreground">{d.strategy}</p>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                <div className="h-full rounded-full bg-success bar-animate" style={{ width: `${d.revival_score}%` }} />
              </div>
            </motion.div>
          )) || <p className="text-muted-foreground text-center py-8">No revival candidates</p>}
        </TabsContent>

        <TabsContent value="viral" className="space-y-3">
          {data?.viral_moments?.map((v: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card space-y-2">
              <p className="text-xs text-muted-foreground">{v.video_title} · {v.timestamp}</p>
              <p className="text-lg italic font-medium">"{v.quote}"</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                  <div className="h-full rounded-full bg-primary bar-animate" style={{ width: `${v.potential}%` }} />
                </div>
                <span className="text-xs font-bold">{v.potential}/100 viral</span>
              </div>
              <p className="text-xs" style={{ color: "hsl(var(--info))" }}>Short title: "{v.short_title}"</p>
            </motion.div>
          )) || <p className="text-muted-foreground text-center py-8">No viral moments found</p>}
        </TabsContent>
      </Tabs>

      {data && <ShareInsight title="Hidden Gold" value={`${(data.shorts?.length || 0) + (data.viral_moments?.length || 0)} moments`} subtitle={`${data.shorts?.length || 0} shorts • ${data.dead_revival?.length || 0} revivals • ${data.viral_moments?.length || 0} viral`} />}
    </FeaturePage>
  );
}
