import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Loader2, AlertCircle, ArrowRight, CheckCircle2, 
  Sparkles, Youtube
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { AnalysisData } from '@/shared/types'

interface AnalyzeProps {
  setAnalysisData: (data: AnalysisData) => void
}

export default function Analyze({ setAnalysisData }: AnalyzeProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  const steps = [
    'Finding channel...',
    'Fetching videos...',
    'Computing patterns...',
    'Generating insights...'
  ]

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast({ title: 'Please enter a YouTube channel URL', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    setError('')
    setStep(0)

    // Animate steps
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1))
    }, 1500)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: url })
      })
      
      clearInterval(stepInterval)
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error || 'Analysis failed')
        toast({ title: data.error || 'Analysis failed', variant: 'destructive' })
        setLoading(false)
        return
      }
      
      setAnalysisData(data.data)
      toast({ title: 'Analysis complete!' })
      navigate('/')
    } catch (err: any) {
      clearInterval(stepInterval)
      setError(err.message || 'Network error. Please try again.')
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

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
            <Youtube className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold">Analyze Channel</h1>
          </div>
          <p className="text-muted-foreground">
            Enter any YouTube channel URL to get AI-powered insights and growth recommendations.
          </p>
        </motion.div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube Channel URL</label>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g., youtube.com/@mrbeast or youtube.com/channel/UC..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                  className="flex-1 h-12"
                  disabled={loading}
                />
                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading || !url.trim()}
                  className="h-12 px-6"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Works with @handles, channel IDs, or full URLs
              </p>
            </div>

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 pt-4"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <p className="font-medium">{steps[step]}</p>
                </div>
                <div className="space-y-2">
                  {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${
                        i < step ? 'bg-primary text-primary-foreground' :
                        i === step ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {i < step ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                      </div>
                      <span className={`text-sm ${
                        i <= step ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Analysis failed</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  Retry
                </Button>
              </motion.div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">What you will get:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Channel health score',
                  'Upload timing insights',
                  'Content series analysis',
                  '5 strategic recommendations',
                  'Competitor opportunities',
                  'Sponsor deal detection'
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
