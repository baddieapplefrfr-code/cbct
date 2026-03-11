import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Zap, TrendingUp, Clock, Calendar, AlertTriangle, 
  ArrowRight, Eye, BarChart3, CheckCircle, Sparkles,
  Play, Target, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { AnalysisData } from '@/shared/types'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

interface OverviewProps {
  analysisData: AnalysisData | null
  setAnalysisData: (data: AnalysisData) => void
}

export default function Overview({ analysisData, setAnalysisData }: OverviewProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  const hasAnalysis = !!analysisData

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({ title: 'Please enter a YouTube channel URL', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: url })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Analysis failed', variant: 'destructive' })
        return
      }
      setAnalysisData(data.data)
      toast({ title: 'Channel analyzed successfully!' })
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Graph data preparation
  const graphData = useMemo(() => {
    if (!analysisData?.videos) return []
    const now = Date.now()
    const cutoff = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 3650
    return analysisData.videos
      .filter((v: any) => (now - new Date(v.publishedAt).getTime()) / 86400000 <= cutoff)
      .slice(0, timeRange === 'all' ? 200 : 50)
      .reverse()
      .map((v: any) => ({
        views: v.viewCount || 0,
        date: new Date(v.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
  }, [analysisData, timeRange])

  // Check if latest video is underperforming
  const isUnderperforming = useMemo(() => {
    if (!analysisData?.videos?.length || !analysisData?.metrics?.averageViews) return false
    const latest = analysisData.videos[0]
    return latest.viewCount < analysisData.metrics.averageViews * 0.5
  }, [analysisData])

  if (!hasAnalysis) {
    // Hero state - no analysis yet
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              CreatorBrain
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your AI YouTube Growth Manager
            </p>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Enter any YouTube channel URL to get AI-powered insights, content recommendations, 
              and growth strategies tailored to your niche.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto mb-16"
          >
            <div className="flex gap-3">
              <Input
                placeholder="Paste YouTube channel URL (e.g., youtube.com/@channel)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="flex-1 h-12"
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="h-12 px-6"
              >
                {loading ? (
                  <Sparkles className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Analyze
              </Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { 
                icon: Target, 
                title: 'Channel Analysis', 
                desc: 'Deep dive into your content performance, upload patterns, and audience engagement.' 
              },
              { 
                icon: Sparkles, 
                title: 'AI-Powered Insights', 
                desc: 'Get actionable recommendations to grow your channel faster.' 
              },
              { 
                icon: TrendingUp, 
                title: 'Content Strategy', 
                desc: 'Discover what works in your niche and how to beat competitors.' 
              }
            ].map((feature, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  // Dashboard state - with analysis
  const { channel, metrics, healthScore, series, uploadTimeInsights, strategicInsights } = analysisData

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <img 
            src={channel.thumbnailUrl} 
            alt={channel.title}
            className="h-14 w-14 rounded-full ring-2 ring-primary/20 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{channel.title}</h1>
            <p className="text-sm text-muted-foreground">
              {channel.subscriberCount.toLocaleString()} subscribers • {channel.videoCount} videos
            </p>
          </div>
          <Button 
            variant="outline" 
            className="ml-auto"
            onClick={() => navigate('/analyze')}
          >
            Analyze Another
          </Button>
        </div>

        {/* Underperforming Alert */}
        {isUnderperforming && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl p-4 flex items-start gap-3 border border-destructive/30 bg-destructive/5"
          >
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Latest video is underperforming</p>
              <p className="text-sm text-muted-foreground">
                "{analysisData.videos[0].title.slice(0, 50)}..." got {analysisData.videos[0].viewCount.toLocaleString()} views 
                — well below your {metrics.averageViews.toLocaleString()} average
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/diagnose/video-death')}
            >
              Run Autopsy <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </motion.div>
        )}

        {/* Connect Google Card */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Connect Google for Private Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Unlock CTR, retention rate, impressions and revenue data
                </p>
              </div>
            </div>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                const origin = window.location.origin
                window.location.href = `/api/auth/login?redirect=${encodeURIComponent(origin + '/auth/callback')}`
              }}
            >
              Connect Google
            </Button>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Views', value: metrics.averageViews.toLocaleString(), icon: Eye },
            { label: 'Channel Score', value: `${healthScore.total}/100`, icon: TrendingUp },
            { label: 'Best Day', value: uploadTimeInsights.bestDay.slice(0, 3), icon: Calendar },
            { label: 'Frequency', value: metrics.uploadFrequencyDays === 1 ? 'Daily' : `${metrics.uploadFrequencyDays}d`, icon: Clock },
          ].map((m, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <m.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</span>
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Views Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Views Per Upload</CardTitle>
              </div>
              <div className="flex gap-1">
                {(['7d', '30d', 'all'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      timeRange === r ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r === 'all' ? 'All' : r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {graphData.length <= 1 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                Not enough data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={graphData}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg px-3 py-2 bg-background border shadow-lg">
                          <p className="font-semibold">{payload[0].value?.toLocaleString()} views</p>
                        </div>
                      )
                    }}
                  />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#viewsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Strategic Insight */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Key Insight</p>
                <p className="text-sm text-muted-foreground">{strategicInsights[0]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Get Roasted', path: '/diagnose/roast', icon: Target },
              { label: 'Video Autopsy', path: '/diagnose/video-death', icon: AlertTriangle },
              { label: 'What To Make Next', path: '/strategy/next-video', icon: Sparkles },
              { label: 'Title Scorer', path: '/preupload', icon: CheckCircle },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="p-4 rounded-xl border bg-card hover:bg-accent transition-colors text-left group"
              >
                <action.icon className="h-5 w-5 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="font-medium text-sm">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
