import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, ArrowRight, Copy, CheckCircle, Sparkles, 
  Loader2, Globe, RefreshCw, TrendingDown, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { Trend, NicheOption, CountryOption } from '@/shared/types'

const niches: { id: NicheOption; label: string }[] = [
  { id: 'Education', label: 'Education' },
  { id: 'Finance', label: 'Finance' },
  { id: 'Gaming', label: 'Gaming' },
  { id: 'Tech', label: 'Tech' },
  { id: 'Fitness', label: 'Fitness' },
  { id: 'Motivation', label: 'Motivation' },
  { id: 'General', label: 'General' },
]

const countries: { id: CountryOption; label: string }[] = [
  { id: 'India', label: 'India' },
  { id: 'US', label: 'United States' },
  { id: 'UK', label: 'United Kingdom' },
  { id: 'Canada', label: 'Canada' },
  { id: 'Australia', label: 'Australia' },
  { id: 'Global', label: 'Global' },
]

const stageColors: Record<string, string> = {
  Rising: 'bg-green-500/10 text-green-500 border-green-500/30',
  Peak: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  Early: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
}

const competitionColors: Record<string, string> = {
  High: 'text-red-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
}

export default function Trends() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [niche, setNiche] = useState<NicheOption>('General')
  const [country, setCountry] = useState<CountryOption>('India')
  const [loading, setLoading] = useState(false)
  const [trends, setTrends] = useState<Trend[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, country })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Failed to fetch trends', variant: 'destructive' })
        return
      }
      setTrends(data.data.trends)
      setLastUpdated(data.data.lastUpdated)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchTrends()
  }, [])

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
    toast({ title: 'Title copied!' })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
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
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Trending Topics</h1>
          </div>
          <p className="text-muted-foreground">
            Discover what's trending now and capitalize on rising search interest.
          </p>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Niche</label>
                <div className="flex flex-wrap gap-2">
                  {niches.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setNiche(n.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        niche === n.id 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <div className="flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCountry(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        country === c.id 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={fetchTrends} 
                disabled={loading}
                className="h-10"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Trends
              </Button>
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-4">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trends Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : trends.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${stageColors[trend.stage]}`}>
                        {trend.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Score:</span>
                        <span className="text-sm font-bold">{trend.trendScore}</span>
                      </div>
                    </div>

                    {/* Topic */}
                    <h3 className="font-semibold text-lg leading-tight">
                      {trend.topic}
                    </h3>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{trend.window}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={competitionColors[trend.competition]}>
                          {trend.competition} competition
                        </span>
                      </div>
                    </div>

                    {/* Suggested Title */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Suggested title:</p>
                      <p className="text-sm font-medium">{trend.suggestedTitle}</p>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(trend.suggestedTitle, i)}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors"
                    >
                      {copiedIndex === i ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {copiedIndex === i ? 'Copied!' : 'Copy Title'}
                      </span>
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No trends available. Try refreshing.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
