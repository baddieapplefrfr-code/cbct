import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Copy, CheckCircle, Sparkles, ArrowRight, 
  Loader2, Clock, BookOpen, Zap, Target, Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import type { ScriptResult, StyleOption, DurationOption } from '@/shared/types'

const styles: { id: StyleOption; label: string; icon: typeof BookOpen }[] = [
  { id: 'Educational', label: 'Educational', icon: BookOpen },
  { id: 'Entertainment', label: 'Entertainment', icon: Zap },
  { id: 'Motivational', label: 'Motivational', icon: Target },
  { id: 'Story', label: 'Story', icon: FileText },
]

const durations: { id: DurationOption; label: string }[] = [
  { id: '60sec', label: '60 sec' },
  { id: '5min', label: '5 min' },
  { id: '10min', label: '10 min' },
  { id: '15min', label: '15 min' },
]

export default function Scripts() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState<StyleOption>('Educational')
  const [duration, setDuration] = useState<DurationOption>('5min')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScriptResult | null>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Please enter a topic', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, style, duration })
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: data.error || 'Generation failed', variant: 'destructive' })
        return
      }
      setResult(data.data)
    } catch (err: any) {
      toast({ title: err.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
    toast({ title: 'Copied!' })
  }

  const copyAll = () => {
    if (!result) return
    const all = `
${result.titles[0]}

HOOK:
${result.hook}

INTRO:
${result.intro}

${result.sections.map(s => `${s.title} (${s.duration}):
${s.content}`).join('\n\n')}

CTA:
${result.cta}

END SCREEN:
${result.endScreen}

DESCRIPTION:
${result.description}

HASHTAGS:
${result.hashtags.join(' ')}
    `.trim()
    navigator.clipboard.writeText(all)
    toast({ title: 'Full script copied!' })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
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
            <h1 className="text-2xl font-bold">Script Generator</h1>
          </div>
          <p className="text-muted-foreground">
            Generate complete YouTube scripts with hooks, sections, CTAs, and SEO metadata.
          </p>
        </motion.div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Topic</label>
              <Input
                placeholder="e.g., How to start investing with just Rs500 per month"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {styles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        style === s.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                      <span className="text-sm">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`p-3 rounded-lg border transition-colors ${
                        duration === d.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <span className="text-sm font-medium">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading || !topic.trim()}
              className="w-full h-12"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Script
            </Button>
          </CardContent>
        </Card>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Main Script Content */}
            <div className="md:col-span-2 space-y-6">
              <Tabs defaultValue="hook" className="w-full">
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="hook">Hook</TabsTrigger>
                  <TabsTrigger value="intro">Intro</TabsTrigger>
                  <TabsTrigger value="sections">Sections</TabsTrigger>
                  <TabsTrigger value="cta">CTA</TabsTrigger>
                  <TabsTrigger value="end">End</TabsTrigger>
                </TabsList>

                <TabsContent value="hook" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Opening Hook
                        </CardTitle>
                        <CardDescription>First 30-60 seconds</CardDescription>
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.hook, 'hook')}
                        className="p-2 hover:bg-accent rounded-md"
                      >
                        {copiedSection === 'hook' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg leading-relaxed">{result.hook}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="intro" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Introduction</CardTitle>
                      <button
                        onClick={() => copyToClipboard(result.intro, 'intro')}
                        className="p-2 hover:bg-accent rounded-md"
                      >
                        {copiedSection === 'intro' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{result.intro}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sections" className="mt-4">
                  <div className="space-y-4">
                    {result.sections.map((section, i) => (
                      <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {section.duration}
                            </span>
                            <CardTitle className="text-base">{section.title}</CardTitle>
                          </div>
                          <button
                            onClick={() => copyToClipboard(section.content, `section-${i}`)}
                            className="p-2 hover:bg-accent rounded-md"
                          >
                            {copiedSection === `section-${i}` ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="leading-relaxed">{section.content}</p>
                          <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-l-primary">
                            <p className="text-sm font-medium text-primary mb-1">Micro-hook:</p>
                            <p className="text-sm italic">"{section.microHook}"</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="cta" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Call to Action</CardTitle>
                      <button
                        onClick={() => copyToClipboard(result.cta, 'cta')}
                        className="p-2 hover:bg-accent rounded-md"
                      >
                        {copiedSection === 'cta' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{result.cta}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="end" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">End Screen (20 sec)</CardTitle>
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.endScreen, 'end')}
                        className="p-2 hover:bg-accent rounded-md"
                      >
                        {copiedSection === 'end' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed">{result.endScreen}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Suggested Titles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.titles.map((t, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded-lg bg-muted/50 text-sm font-medium"
                    >
                      {t}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {result.description}
                  </p>
                  <button
                    onClick={() => copyToClipboard(result.description, 'desc')}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Copy full description
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <CardTitle className="text-base">Hashtags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.hashtags.map((h) => (
                      <span key={h} className="px-2 py-1 bg-muted rounded-md text-sm">
                        {h}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thumbnail</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {result.thumbnailConcept}
                  </p>
                </CardContent>
              </Card>

              <Button onClick={copyAll} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Entire Script
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
