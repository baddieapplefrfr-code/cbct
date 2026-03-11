import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle, Copy, Sparkles, Target, AlertTriangle, 
  ArrowRight, Loader2, Lightbulb, Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { PreUploadResult } from '@/shared/types'

export default function PreUpload() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreUploadResult | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleScore = async () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/preupload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Scoring failed', variant: 'destructive' })
        return
      }
      setResult(data.data)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
    toast({ title: 'Copied to clipboard!' })
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500/10 border-green-500/30'
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
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
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Title Scorer</h1>
          </div>
          <p className="text-muted-foreground">
            Score your YouTube title before uploading. Get AI-powered improvements and hook suggestions.
          </p>
        </motion.div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Title</label>
                <Input
                  placeholder="Enter your YouTube video title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleScore()}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic (optional)</label>
                <Input
                  placeholder="e.g., fitness, money, tech..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            <Button 
              onClick={handleScore} 
              disabled={loading || !title.trim()}
              className="w-full h-12"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Score My Title
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className={`grid md:grid-cols-3 gap-4`}>
              <Card className={`${getScoreBg(result.hookScore)}`}>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Hook Score</p>
                  <p className={`text-4xl font-bold ${getScoreColor(result.hookScore)}`}>
                    {result.hookScore}
                  </p>
                  <p className="text-xs mt-2">/100</p>
                </CardContent>
              </Card>
              
              <Card className={`${getScoreBg(result.shadowScore)}`}>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Shadow Score</p>
                  <p className={`text-4xl font-bold ${getScoreColor(result.shadowScore)}`}>
                    {result.shadowScore}
                  </p>
                  <p className="text-xs mt-2">Algorithm prediction</p>
                </CardContent>
              </Card>
              
              <Card className={`${getScoreBg(result.retentionRisk === 'Low' ? 80 : result.retentionRisk === 'Medium' ? 60 : 40)}`}>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Retention Risk</p>
                  <p className={`text-2xl font-bold ${
                    result.retentionRisk === 'Low' ? 'text-green-500' :
                    result.retentionRisk === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {result.retentionRisk}
                  </p>
                  <p className="text-xs mt-2">Clickbait detection</p>
                </CardContent>
              </Card>
            </div>

            {/* Improved Titles */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle>Improved Titles</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.improvedTitles.map((t, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 group"
                  >
                    <span className="text-sm text-muted-foreground font-mono mt-0.5">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <p className="flex-1 font-medium">{t}</p>
                    <button
                      onClick={() => copyToClipboard(t, i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-accent rounded-md"
                    >
                      {copiedIndex === i ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Viral Hooks */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Viral Hooks</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.viralHooks.map((h, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border-l-4 border-l-primary"
                  >
                    <p className="flex-1 italic">"{h}"</p>
                    <button
                      onClick={() => copyToClipboard(h, i + 10)}
                      className="p-2 hover:bg-accent rounded-md"
                    >
                      {copiedIndex === i + 10 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Thumbnail Concept */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <CardTitle>Thumbnail Concept</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Text Overlay</p>
                  <p className="text-xl font-bold tracking-wide">{result.thumbnailConcept.textOverlay}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Visual</p>
                    <p>{result.thumbnailConcept.visualSuggestion}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Emotion</p>
                    <p className="capitalize">{result.thumbnailConcept.emotion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.hookScore < 50 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-600">Low Score Warning</p>
                  <p className="text-sm text-muted-foreground">
                    Your title needs work. Consider using one of the improved titles above 
                    with specific numbers, emotional triggers, or curiosity gaps.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
