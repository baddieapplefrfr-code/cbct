import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Users, ArrowRight, Plus, X, Sparkles, Target, AlertTriangle, 
  Shield, TrendingUp, Loader2, Copy, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { CompetitorAnalysis, CompetitorData } from '@/shared/types'

export default function Competitors() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [urls, setUrls] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompetitorAnalysis | null>(null)

  const addUrl = () => {
    if (urls.length < 5) setUrls([...urls, ''])
  }

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index))
  }

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
  }

  const handleAnalyze = async () => {
    const validUrls = urls.filter(u => u.trim())
    if (validUrls.length === 0) {
      toast({ title: 'Please add at least one competitor URL', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrls: validUrls })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Analysis failed', variant: 'destructive' })
        return
      }
      setResult(data.data)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-500/10 text-red-500 border-red-500/30'
      case 'Medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
      default: return 'bg-green-500/10 text-green-500 border-green-500/30'
    }
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Competitor Intelligence</h1>
          </div>
          <p className="text-muted-foreground">
            Analyze competitor channels to find content gaps and opportunities.
          </p>
        </motion.div>

        {/* Input Section */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Competitor Channel URLs (1-5)</label>
              {urls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Competitor ${i + 1}: youtube.com/@channel`}
                    value={url}
                    onChange={(e) => updateUrl(i, e.target.value)}
                    className="flex-1"
                  />
                  {urls.length > 1 && (
                    <button
                      onClick={() => removeUrl(i)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {urls.length < 5 && (
              <Button variant="outline" onClick={addUrl} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Channel
              </Button>
            )}

            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !urls.some(u => u.trim())}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Analyze Competitors
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Card */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className={getThreatColor(result.threatLevel)}>
                <CardContent className="p-4 text-center">
                  <Shield className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm opacity-80">Threat Level</p>
                  <p className="text-2xl font-bold">{result.threatLevel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Content Gaps</p>
                  <p className="text-2xl font-bold">{result.contentGaps.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Opportunities</p>
                  <p className="text-2xl font-bold">{result.opportunities.length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Competitor Cards */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-semibold">Competitor Analysis</h3>
                {result.competitors.map((comp: CompetitorData, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <img 
                          src={comp.thumbnailUrl} 
                          alt={comp.channelTitle}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{comp.channelTitle}</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">
                              {comp.subscriberCount.toLocaleString()} subs
                            </Badge>
                            <Badge variant="secondary">
                              {comp.avgViews.toLocaleString()} avg views
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-green-600 font-medium mb-1">Strength</p>
                          <p className="text-sm">{comp.strengthSummary || 'Strong content consistency'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-red-600 font-medium mb-1">Weakness</p>
                          <p className="text-sm">{comp.weaknessSummary || 'Limited upload frequency'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Title Formula</p>
                          <p className="text-sm">{comp.titleFormula || 'Number + Outcome + Timeframe'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Posting Pattern</p>
                          <p className="text-sm">{comp.postingPattern || '3-4 videos per week'}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Recent Titles:</p>
                        <div className="space-y-1">
                          {comp.recentTitles.slice(0, 3).map((title, j) => (
                            <p key={j} className="text-sm truncate">• {title}</p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Intelligence Panel */}
              <div className="space-y-4">
                <h3 className="font-semibold">Strategic Intelligence</h3>

                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-base">Win Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.winStrategy}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Content Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.contentGaps.map((gap, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                        {gap}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.opportunities.map((opp, i) => (
                      <div key={i} className="p-3 rounded-lg bg-primary/5 border-l-4 border-l-primary text-sm">
                        {opp}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
