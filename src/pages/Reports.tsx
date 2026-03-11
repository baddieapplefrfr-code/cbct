import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, ArrowRight, Sparkles, TrendingUp, AlertCircle, 
  Target, Ban, Play, BarChart3, Loader2, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { AnalysisData, ChannelReport } from '@/shared/types'

interface ReportsProps {
  analysisData: AnalysisData | null
}

export default function Reports({ analysisData }: ReportsProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ChannelReport | null>(null)

  const handleGenerate = async () => {
    if (!analysisData) {
      toast({ 
        title: 'Analyze your channel first', 
        description: 'Go to Analyze to fetch your channel data',
        variant: 'destructive' 
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisData })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Report generation failed', variant: 'destructive' })
        return
      }
      setReport(data.data)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Empty state - no analysis data
  if (!analysisData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
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
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Channel Report</h1>
            </div>
            <p className="text-muted-foreground">
              Generate a comprehensive weekly report with AI-powered insights.
            </p>
          </motion.div>

          <Card className="text-center p-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-lg font-medium mb-2">No Channel Data</h3>
            <p className="text-muted-foreground mb-6">
              Analyze your YouTube channel first to generate a personalized report.
            </p>
            <Button onClick={() => navigate('/analyze')}>
              Analyze My Channel
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
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
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Channel Report</h1>
          </div>
          <p className="text-muted-foreground">
            Weekly analysis and strategic recommendations for {analysisData.channel.title}.
          </p>
        </motion.div>

        {!report ? (
          <Card className="text-center p-12">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-6" />
            <h3 className="text-lg font-medium mb-2">Generate Your Report</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get a brutally honest weekly analysis with priorities, action items, and growth projections.
            </p>
            <Button 
              onClick={handleGenerate}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </Card>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Week Summary */}
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Week Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{report.weekSummary}</p>
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Best Content Insight */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">Best Content Insight</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{report.bestContentInsight}</p>
                </CardContent>
              </Card>

              {/* Biggest Miss */}
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">Biggest Miss</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{report.biggestMiss}</p>
                </CardContent>
              </Card>
            </div>

            {/* Priorities */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Top 3 Priorities</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.priorities.map((priority, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{priority}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stop / Start Doing */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-base">Stop Doing</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{report.stopDoing}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">Start Doing</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{report.startDoing}</p>
                </CardContent>
              </Card>
            </div>

            {/* Projection */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>90-Day Projection</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{report.projection}</p>
              </CardContent>
            </Card>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Regenerate Report
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
