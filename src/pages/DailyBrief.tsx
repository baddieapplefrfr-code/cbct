import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Sun, ArrowRight, Sparkles, Calendar, Clock, 
  TrendingUp, MessageSquare, Type, Loader2, Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { DailyBrief, NicheOption } from '@/shared/types'

interface DailyBriefProps {
  niche: NicheOption
}

export default function DailyBrief({ niche }: DailyBriefProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<DailyBrief | null>(null)

  const fetchBrief = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-brief?niche=${encodeURIComponent(niche)}`)
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Failed to load brief', variant: 'destructive' })
        return
      }
      setBrief(data.data)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchBrief()
  }, [niche])

  if (loading || !brief) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Sun className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Daily Brief</h1>
          </div>
          <p className="text-muted-foreground">
            Your daily YouTube growth briefing with actionable insights.
          </p>
        </motion.div>

        {/* Greeting Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-medium mb-1">
                    {brief.greeting}, Creator
                  </p>
                  <p className="text-muted-foreground">
                    {brief.dateStr}
                  </p>
                </div>
                <Badge 
                  variant={brief.isGoodDay ? 'default' : 'secondary'}
                  className={brief.isGoodDay ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                >
                  {brief.isGoodDay ? '✓ Good Day to Upload' : 'Film Today, Post Tomorrow'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Video for Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Video for Today</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-medium leading-relaxed">
                {brief.videoForToday.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {brief.videoForToday.reason}
              </p>
              <button
                onClick={() => navigate('/scripts')}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                Generate script for this topic
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Things to Know */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Things to Know Today
          </h3>

          {brief.thingsToKnow.map((thing, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {i === 0 ? <Clock className="h-5 w-5 text-primary" /> :
                     i === 1 ? <MessageSquare className="h-5 w-5 text-primary" /> :
                     <Type className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium mb-1">{thing.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {thing.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Refresh briefing
          </button>
        </motion.div>
      </div>
    </div>
  )
}
