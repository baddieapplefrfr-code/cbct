import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { UsersService } from '@getmocha/users-service'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())
app.use('*', logger())

// ==========================================
// AI MODEL FALLBACK CONFIGURATION
// ==========================================
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile', 
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768'
]

const SMM_PROMPT = `You are Maya, a senior YouTube growth strategist. You have grown 50+ channels to 100K+ subscribers.

ABSOLUTE RULES — BREAKING THESE RUINS THE PRODUCT:

RULE 1 — NEVER OUTPUT TEMPLATE OR PLACEHOLDER TEXT.
Every title, hook, and script line must be a REAL fully formed sentence a viewer would actually click.

THESE ARE BROKEN — NEVER PRODUCE:
  "I Tried money For 30 Days"
  "The Truth About fitness"  
  "How to master food"
  "Understanding [topic] Better"

THESE ARE CORRECT — ALWAYS PRODUCE:
  "I Lived on Rs500 a Day in Mumbai For 30 Days — The Honest Reality"
  "The Truth About Losing Weight After 30 That No Indian Fitness Channel Will Tell You"
  "I Built a Rs5 Lakh Portfolio From Scratch — My Exact System"

Every title MUST contain at least one: specific number, specific place/person, specific result, specific timeframe.

RULE 2 — USE REAL NUMBERS FROM DATA.
Never "your average views" — always "your 12,400 average views".
Never "your best day" — always "your Tuesday uploads".

RULE 3 — DIRECT COMMANDS ONLY.
Never: "Consider posting on Tuesday" → Always: "Post on Tuesday at 6:30PM IST"
Never: "Series may help" → Always: "Make 3 more episodes this month"

RULE 4 — EXPLAIN THE ALGORITHM WHY.
Every recommendation needs a one-sentence algorithm reason.

RULE 5 — MATCH ADVICE TO CHANNEL SIZE.
0-1K: consistency + niche + thumbnail basics only
1K-10K: title optimization + thumbnail testing + format finding
10K-100K: series building + community + collabs
100K+: brand deals + merchandise + cross-platform

RULE 6 — INDIAN CONTEXT.
Use Rs not dollar. Mention Indian cities, cricket, Bollywood, UPSC, JEE, Indian food where relevant.

RULE 7 — JSON ONLY.
Start with { end with }. No markdown. No backticks. Nothing outside JSON.`

// ==========================================
// AI CALLER WITH AUTOMATIC FALLBACK
// ==========================================
async function callAI(prompt: string, systemPrompt: string, env: Env, maxTokens = 1500): Promise<string> {
  const key = env.GROQ_API_KEY
  if (!key) throw new Error('AI not configured')
  
  for (const model of GROQ_MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      })
      
      if (r.status === 429 || r.status === 503 || r.status === 502) {
        console.log(`Model ${model} unavailable (${r.status}), trying next...`)
        continue
      }
      
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as any
        if (err?.error?.code === 'model_not_found' || r.status === 404) {
          console.log(`Model ${model} not found, trying next...`)
          continue
        }
        throw new Error(err?.error?.message || r.statusText)
      }
      
      const data = await r.json() as any
      const content = data.choices?.[0]?.message?.content || ''
      if (!content) continue
      
      console.log(`AI responded using model: ${model}`)
      return content
      
    } catch (e: any) {
      if (e.message?.includes('fetch') || e.message?.includes('timeout') || e.message?.includes('network')) {
        console.log(`Model ${model} network error, trying next...`)
        continue
      }
      throw e
    }
  }
  
  throw new Error('All AI models unavailable. Please try again in a moment.')
}

function parseJSON(text: string): any {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const m = clean.match(/\{[\s\S]*\}/)
  if (m) try { return JSON.parse(m[0]) } catch {}
  throw new Error('AI returned invalid response. Please try again.')
}

// ==========================================
// TOPIC EXPANSION
// ==========================================
function expandTopic(topic: string): string {
  if (!topic) return 'building a successful YouTube channel'
  const map: Record<string, string> = {
    'money': 'building financial freedom on a salary job',
    'food': 'budget high-protein Indian meal prep',
    'fitness': 'body transformation without a gym membership',
    'health': 'fixing daily health habits for Indian lifestyle',
    'life': 'lifestyle design for young Indians',
    'time': 'time management for students and working professionals',
    'work': 'getting ahead in your career faster',
    'mind': 'building mental strength and focus habits',
    'body': 'building your ideal physique naturally',
    'business': 'starting a profitable side business in India',
    'study': 'exam preparation strategies that actually work',
    'travel': 'budget travel hacks for Indian destinations',
    'motivation': 'building unbreakable discipline and consistency',
    'success': 'what separates successful people from average ones',
    'coding': 'learning to code and getting a tech job in India',
    'crypto': 'understanding crypto investing without losing money',
    'stock': 'investing in Indian stock market for beginners',
    'career': 'making the right career moves in your 20s',
    'gaming': 'growing a gaming channel in India',
    'tech': 'the AI tools changing how Indians work and earn',
  }
  return map[topic.toLowerCase().trim()] || topic
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (c) => c.json({ success: true, status: 'ok' }))

// ==========================================
// POST /api/analyze — FULL CHANNEL ANALYSIS
// ==========================================
app.post('/api/analyze', async (c) => {
  const { channelUrl } = await c.req.json()
  const key = c.env.YOUTUBE_API_KEY
  if (!channelUrl?.trim()) return c.json({ success: false, error: 'Please enter a YouTube channel URL' }, 400)
  if (!key) return c.json({ success: false, error: 'YouTube API key not configured' }, 500)

  const YT = 'https://www.googleapis.com/youtube/v3'
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  try {
    // CHANNEL LOOKUP
    let channelId = ''
    if (channelUrl.includes('channel/')) {
      channelId = channelUrl.split('channel/')[1].split(/[/?]/)[0]
    } else {
      const atMatch = channelUrl.match(/@([^/?&\s]+)/)
      const handle = atMatch ? atMatch[1] : channelUrl.replace(/https?:\/\/(www\.)?youtube\.com\/?/i,'').replace(/^@/,'').split(/[/?]/)[0].trim()
      
      const fh = await fetch(`${YT}/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${key}`).then(r=>r.json()) as any
      if (fh.items?.length > 0) {
        channelId = fh.items[0].id
      } else {
        const sr = await fetch(`${YT}/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=5&key=${key}`).then(r=>r.json()) as any
        const match = sr.items?.find((i:any) => i.snippet?.channelTitle?.toLowerCase() === handle.toLowerCase())
        channelId = match?.id?.channelId || sr.items?.[0]?.id?.channelId || ''
      }
    }
    
    if (!channelId) return c.json({ success: false, error: 'Channel not found. Try pasting the full YouTube URL (e.g. https://youtube.com/@channelname)' }, 404)

    // FETCH CHANNEL
    const chanData = await fetch(`${YT}/channels?part=snippet,statistics&id=${channelId}&key=${key}`).then(r=>r.json()) as any
    if (!chanData.items?.length) return c.json({ success: false, error: 'Channel is private or does not exist' }, 404)
    const chan = chanData.items[0]

    // FETCH VIDEOS (50)
    const vSearch = await fetch(`${YT}/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${key}`).then(r=>r.json()) as any
    const videoIds = vSearch.items?.map((v:any) => v.id?.videoId).filter(Boolean) || []
    if (!videoIds.length) return c.json({ success: false, error: 'No public videos found' }, 404)

    // FETCH STATS
    const vStats = await fetch(`${YT}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${key}`).then(r=>r.json()) as any
    const now = Date.now()
    
    const videos = (vStats.items || []).map((v:any) => {
      const vc = parseInt(v.statistics?.viewCount || '0')
      const lc = parseInt(v.statistics?.likeCount || '0')
      const cc = parseInt(v.statistics?.commentCount || '0')
      const pub = v.snippet?.publishedAt || new Date().toISOString()
      const days = Math.max(1, Math.floor((now - new Date(pub).getTime()) / 86400000))
      return {
        id: v.id, title: v.snippet?.title || '',
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
        viewCount: vc, likeCount: lc, commentCount: cc,
        publishedAt: pub, daysSinceUpload: days,
        viewVelocity: Math.floor(vc / days),
        engagementRate: vc > 0 ? (lc + cc) / vc : 0,
        publishHour: new Date(pub).getUTCHours(),
        publishDay: new Date(pub).getUTCDay(),
        duration: v.contentDetails?.duration || 'PT0S',
        description: (v.snippet?.description || '').slice(0, 500)
      }
    })

    // METRICS
    const totalViews = videos.reduce((s:number,v:any)=>s+v.viewCount,0)
    const totalLikes = videos.reduce((s:number,v:any)=>s+v.likeCount,0)
    const totalComments = videos.reduce((s:number,v:any)=>s+v.commentCount,0)
    const avgViews = Math.floor(totalViews / Math.max(1, videos.length))
    const avgVelocity = Math.floor(videos.reduce((s:number,v:any)=>s+v.viewVelocity,0) / Math.max(1, videos.length))
    const channelEngRate = (totalLikes + totalComments) / Math.max(1, totalViews)

    // UPLOAD FREQUENCY
    const sortedByDate = [...videos].sort((a:any,b:any) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    let uploadFreqDays = 7
    if (sortedByDate.length >= 2) {
      const gaps = sortedByDate.slice(1).map((v:any,i:number) => (new Date(v.publishedAt).getTime() - new Date(sortedByDate[i].publishedAt).getTime()) / 86400000)
      uploadFreqDays = Math.max(1, Math.round(gaps.reduce((s:number,g:number)=>s+g,0) / gaps.length))
    }

    // UPLOAD TIMING
    const dayMap: Record<string,{total:number,count:number}> = {}
    const timeMap: Record<string,{total:number,count:number}> = {}
    videos.forEach((v:any) => {
      const dn = DAY_NAMES[v.publishDay]
      if (!dayMap[dn]) dayMap[dn] = {total:0,count:0}
      dayMap[dn].total += v.viewCount; dayMap[dn].count++
      const b = Math.floor(v.publishHour/3)*3
      const tk = `${String(b).padStart(2,'0')}:00-${String(b+3).padStart(2,'0')}:00` 
      if (!timeMap[tk]) timeMap[tk] = {total:0,count:0}
      timeMap[tk].total += v.viewCount; timeMap[tk].count++
    })
    const dayBreakdown = Object.entries(dayMap).map(([day,d])=>({day, avgViews:Math.floor(d.total/d.count), videoCount:d.count})).sort((a,b)=>b.avgViews-a.avgViews)
    const timeBreakdown = Object.entries(timeMap).map(([timeBlock,d])=>({timeBlock, avgViews:Math.floor(d.total/d.count), videoCount:d.count})).sort((a,b)=>b.avgViews-a.avgViews)
    const bestDay = dayBreakdown[0]?.day || 'Tuesday'
    const worstDay = dayBreakdown[dayBreakdown.length-1]?.day || 'Sunday'
    const bestTimeBlock = timeBreakdown[0]?.timeBlock || '15:00-18:00'
    const perfMult = parseFloat(((dayBreakdown[0]?.avgViews||1) / Math.max(1, dayBreakdown[dayBreakdown.length-1]?.avgViews||1)).toFixed(1))

    // SERIES
    const seriesMap: Record<string,{name:string,views:number[]}> = {}
    videos.forEach((v:any) => {
      const m1 = v.title.match(/^(.+?)\s*(?:#|ep\.?|episode\s*)\s*\d+/i)
      if (m1) { const k=m1[1].trim().toLowerCase(); if(!seriesMap[k]) seriesMap[k]={name:m1[1].trim(),views:[]}; seriesMap[k].views.push(v.viewCount); return }
      const m2 = v.title.match(/^([^:]{4,35}):\s+.{5,}/)
      if (m2) { const k=m2[1].trim().toLowerCase(); if(!seriesMap[k]) seriesMap[k]={name:m2[1].trim(),views:[]}; seriesMap[k].views.push(v.viewCount) }
    })
    const series = Object.values(seriesMap).filter((s:any)=>s.views.length>=2).map((s:any)=>{
      const avg = Math.floor(s.views.reduce((a:number,b:number)=>a+b,0)/s.views.length)
      return {name:s.name, videoCount:s.views.length, averageViews:avg, averageVelocity:0, performanceMultiplier:parseFloat((avg/Math.max(1,avgViews)).toFixed(2))}
    }).sort((a:any,b:any)=>b.performanceMultiplier-a.performanceMultiplier)

    // TITLE WORDS
    const stopwords = new Set(['the','and','for','that','this','with','from','are','was','were','have','has','been','what','when','how','why','you','your','its','not','but','can','will','all','one','more','than','they','their','about','just','into','also'])
    const wc: Record<string,number> = {}
    videos.forEach((v:any) => v.title.toLowerCase().split(/\W+/).forEach((w:string) => { if(w.length>=3 && !stopwords.has(w)) wc[w]=(wc[w]||0)+1 }))
    const commonTitleWords = Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([word,count])=>({word,count}))
    const uniqueFirstWords = new Set(videos.map((v:any)=>v.title.split(/\s+/)[0]?.toLowerCase())).size

    // NICHE DETECTION
    const allText = (videos.map((v:any)=>v.title).join(' ') + ' ' + (chan.snippet?.description||'').slice(0,600)).toLowerCase()
    const niches: Record<string,{p:string[],s:string[]}> = {
      Gaming:{p:['gaming','game','gameplay','minecraft','pubg','bgmi','free fire','valorant','gta','roblox'],s:['play','win','kill','squad','rank']},
      Education:{p:['study','learn','tutorial','explain','school','college','exam','upsc','jee','neet','course','teach'],s:['tips','guide','steps','beginner','basics']},
      Finance:{p:['money','invest','stock','crypto','income','wealth','profit','trading','sensex','nifty','rupee','finance','lakh'],s:['earn','rich','budget','savings','tax','salary']},
      Tech:{p:['tech','technology','ai','coding','programming','software','app','smartphone','android','laptop','chatgpt'],s:['digital','tool','update','device','review']},
      Fitness:{p:['workout','gym','fitness','exercise','yoga','diet','weight loss','muscle','protein','training'],s:['body','fat','calories','cardio','strength','transformation']},
      Motivation:{p:['motivation','success','mindset','entrepreneur','hustle','goals','inspire','productivity','discipline'],s:['achieve','growth','focus','grind','dream']},
      Entertainment:{p:['challenge','stunt','experiment','survive','spend','extreme','prank','reaction','vs','impossible','million'],s:['won','lost','bought','built','shocking']},
      Bollywood:{p:['movie','film','bollywood','series','ott','music','celebrity','netflix','trailer','song','actor'],s:['watch','drama','comedy','thriller','release']},
      Vlogs:{p:['vlog','day in my life','routine','lifestyle','travel','food','cooking','recipe','daily'],s:['morning','home','family','friends','fun']},
      News:{p:['news','breaking','latest','update','current affairs','india news','world news','explained'],s:['analysis','crisis','happening','development']}
    }
    const scores: Record<string,number> = {}
    Object.entries(niches).forEach(([name,{p,s}])=>{scores[name]=p.reduce((a:number,k:string)=>a+(allText.includes(k)?3:0),0)+s.reduce((a:number,k:string)=>a+(allText.includes(k)?1:0),0)})
    const sortedN = Object.entries(scores).sort((a,b)=>b[1]-a[1])
    const dominantNiche = sortedN[0][1]>=3 ? sortedN[0][0] : 'General'

    // HEALTH SCORE
    const velocityScore = Math.min(95, Math.floor(avgVelocity/500*100))
    const consistencyScore = Math.max(10, Math.min(95, 100-Math.max(0,uploadFreqDays-3)*3))
    const diversityScore = Math.min(95, uniqueFirstWords*7)
    const engagementScore = Math.min(95, Math.floor(channelEngRate*2000))
    const healthTotal = Math.floor((velocityScore+consistencyScore+diversityScore+engagementScore)/4)

    // SPONSOR DETECTION
    const sponsorKeywords = ['sponsored by','in partnership with','brought to you by','use code','use my code','affiliate','discount code','promo code','skillshare','squarespace','nordvpn','expressvpn','brilliant','audible','manscaped','hellofresh','ag1','surfshark']
    const sponsorDeals: any[] = []
    videos.forEach((v:any)=>{
      const desc = v.description.toLowerCase()
      for(const kw of sponsorKeywords){
        if(desc.includes(kw)){
          const brand = ['skillshare','squarespace','nordvpn','expressvpn','brilliant','audible','manscaped','hellofresh','ag1','surfshark'].includes(kw) ? kw : (() => { const idx=desc.indexOf(kw); return desc.slice(idx+kw.length,idx+kw.length+25).trim().split(/\s/)[0]||kw })()
          if(!sponsorDeals.find((s:any)=>s.videoId===v.id)) sponsorDeals.push({brand:brand.replace(/[^a-z0-9 ]/gi,'').trim(), videoTitle:v.title, videoId:v.id})
          break
        }
      }
    })

    // CONTENT FINGERPRINT
    const topV = [...videos].sort((a:any,b:any)=>b.viewCount-a.viewCount)[0]
    const contentFingerprint = {
      dominantNiche,
      contentStyle: topV?.title?.includes('?') ? 'Question-led' : 'Statement-led',
      averageTitleLength: videos.reduce((s:number,v:any)=>s+v.title.length,0)/Math.max(1,videos.length)>50 ? 'Long (50+ chars)' : 'Medium (30-50 chars)',
      bestPerformingFormat: series.length>0 ? 'Series' : 'Standalone'
    }

    // STRATEGIC INSIGHTS
    const botV = [...videos].sort((a:any,b:any)=>a.viewCount-b.viewCount)[0]
    const topSeries = series[0]
    const topWord = commonTitleWords[0]
    const engPct = (channelEngRate*100).toFixed(1)
    const insights: string[] = []

    if (topSeries?.performanceMultiplier>=1.3) {
      insights.push(`Your "${topSeries.name}" series averages ${topSeries.averageViews.toLocaleString()} views — ${Math.round((topSeries.performanceMultiplier-1)*100)}% above your ${avgViews.toLocaleString()} channel average. Make 3 more episodes before creating anything else. Series compound — each new episode promotes every past one.`)
    } else {
      insights.push(`No strong series detected — this is your single biggest growth blocker. Take your top video "${topV?.title?.slice(0,40)}..." and make it Episode 1 this week. Series get 30–50% more algorithmic distribution than standalone videos.`)
    }

    if (perfMult>=1.5) {
      insights.push(`${bestDay} posts average ${(dayBreakdown[0]?.avgViews||0).toLocaleString()} views vs ${(dayBreakdown[dayBreakdown.length-1]?.avgViews||0).toLocaleString()} on ${worstDay} — a ${perfMult}x gap. Lock in ${bestDay} at ${bestTimeBlock} UTC starting immediately.`)
    } else {
      insights.push(`${bestDay} at ${bestTimeBlock} UTC is your best window. Post at the exact same time every week — the algorithm rewards predictability.`)
    }

    if (topWord?.count>=3) {
      insights.push(`"${topWord.word}" appears in ${topWord.count} of your titles. Use this word deliberately in your next 5 titles and track if performance improves.`)
    } else {
      insights.push(`Your titles don't have a consistent keyword pattern yet. Test question format ("Why does X happen?") vs number format ("7 ways to X") over your next 10 videos.`)
    }

    if (channelEngRate<0.01) {
      insights.push(`Your ${engPct}% engagement is critically low. Fix today: end every video with "Comment below: [specific question about this video's topic]". Reply to every comment within 30 minutes of posting.`)
    } else if (channelEngRate<0.03) {
      insights.push(`At ${engPct}% engagement you are slightly below average. Pin a question comment within 5 minutes of every upload — first-hour engagement is worth 10x to the algorithm vs later comments.`)
    } else {
      insights.push(`Your ${engPct}% engagement is strong. Add a "stay till the end" hook at 60% through every video. This alone can lift average view duration by 15–20%.`)
    }

    const gapX = botV?.viewCount>0 ? parseFloat((topV?.viewCount/botV.viewCount).toFixed(1)) : 0
    insights.push(`Your best video "${topV?.title?.slice(0,40)}..." has ${topV?.viewCount.toLocaleString()} views. Your weakest has ${botV?.viewCount.toLocaleString()}. ${gapX>1?`That is a ${gapX}x performance gap.`:''} Compare their thumbnails, title structure, and first 15 seconds. Apply what works to your next upload.`)

    return c.json({
      success: true,
      data: {
        channel: { id:channelId, title:chan.snippet?.title||'', description:chan.snippet?.description||'', thumbnailUrl:chan.snippet?.thumbnails?.medium?.url||'', customUrl:chan.snippet?.customUrl||'', subscriberCount:parseInt(chan.statistics?.subscriberCount||'0'), videoCount:parseInt(chan.statistics?.videoCount||'0'), viewCount:parseInt(chan.statistics?.viewCount||'0') },
        videos,
        metrics: { averageViews:avgViews, averageVelocity:avgVelocity, averageLikes:Math.floor(totalLikes/Math.max(1,videos.length)), averageComments:Math.floor(totalComments/Math.max(1,videos.length)), uploadFrequencyDays:uploadFreqDays, topPerformingVideo:topV, weakestVideo:botV, commonTitleWords },
        healthScore: { total:healthTotal, velocity:velocityScore, consistency:consistencyScore, titleDiversity:diversityScore, engagement:engagementScore },
        series,
        uploadTimeInsights: { bestDay, worstDay, bestTimeBlock, performanceMultiplier:perfMult, dayBreakdown, timeBreakdown },
        strategicInsights: insights,
        contentFingerprint,
        sponsorDeals
      }
    })
  } catch(err:any) {
    return c.json({ success:false, error: err.message || 'Analysis failed' }, 500)
  }
})

// ==========================================
// POST /api/preupload — TITLE SCORING
// ==========================================
app.post('/api/preupload', async (c) => {
  const { title, topic } = await c.req.json()
  if (!title?.trim()) return c.json({ success: false, error: 'Title is required' }, 400)
  
  const expandedTopic = expandTopic(topic || '')
  
  // Rule-based scoring
  let hookScore = 30
  if (/\d/.test(title)) hookScore += 18
  if (title.includes('?')) hookScore += 12
  if (/fail|wrong|mistake|avoid|never|worst|danger|warning|regret/i.test(title)) hookScore += 15
  if (/secret|truth|revealed|exposed|hidden|shocking|nobody|untold/i.test(title)) hookScore += 14
  if (/ultimate|proven|simple|easy|fast|master|best|top|complete/i.test(title)) hookScore += 10
  if (title.length >= 40 && title.length <= 65) hookScore += 8
  if (title.length < 20) hookScore -= 15
  if (title.length > 80) hookScore -= 8
  if (title.trim().split(/\s+/).length < 4) hookScore -= 15
  hookScore = Math.max(5, Math.min(99, hookScore))
  const shadowScore = Math.floor(hookScore * 0.55 + hookScore * 0.45)
  const retentionRisk = hookScore >= 70 ? 'Low' : hookScore >= 50 ? 'Medium' : 'High'

  try {
    const aiResult = parseJSON(await callAI(
      `You are improving a YouTube title for an Indian creator.
Topic: ${expandedTopic}
Current title: '${title}'
Score: ${hookScore}/100

Generate 3 improved titles and 3 hooks.

TITLE RULES: Every title MUST contain a specific number, place, timeframe, or result. FULLY FORMED only — no placeholders or brackets.
Good: "I Saved Rs2 Lakh in 8 Months on a Rs25,000 Salary — Here is Exactly How"
Bad: "How to Save Money Better"

HOOK RULES: 15-30 words. NEVER start with: hey guys, welcome back, in this video, today I, hi everyone.
Use fear trigger OR bold claim OR shocking statistic.

Return JSON: {
  improvedTitles: ["title 1 with specific number/result", "title 2 different angle", "title 3 question/fear format"],
  viralHooks: ["hook using fear or stat 15-30 words", "hook using bold claim 15-30 words", "hook using direct challenge 15-30 words"],
  thumbnailConcept: { textOverlay: "MAX 4 WORDS CAPS", visualSuggestion: "specific scene description", emotion: "shocked or curious or excited or angry" }
}`,
      SMM_PROMPT, c.env, 1000
    ))
    return c.json({ success: true, data: { hookScore, shadowScore, retentionRisk, ...aiResult } })
  } catch {
    const safeTopic = expandedTopic.split(' ').length > 2 ? expandedTopic : 'building a successful YouTube channel'
    return c.json({ success: true, data: {
      hookScore, shadowScore, retentionRisk,
      improvedTitles: [
        `I Spent 30 Days Focused Only On ${safeTopic} — Here Is What Actually Happened`,
        `The Biggest Mistake People Make With ${safeTopic} (I Learned This the Hard Way)`,
        `Nobody Talks About This Side of ${safeTopic} — My Honest 6-Month Experience` 
      ],
      viralHooks: [
        `Most people approach ${safeTopic} completely backwards — and it is silently costing them years of progress.`,
        `I spent 6 months getting ${safeTopic} wrong before I discovered what actually works.`,
        `If you are struggling with ${safeTopic}, the real problem is almost certainly not what you think it is.` 
      ],
      thumbnailConcept: { textOverlay: 'YOU ARE WRONG', visualSuggestion: 'Face with shocked expression pointing at camera', emotion: 'shocked' }
    }})
  }
})

// ==========================================
// POST /api/script — SCRIPT GENERATION
// ==========================================
app.post('/api/script', async (c) => {
  const { topic, style, duration } = await c.req.json()
  if (!topic?.trim()) return c.json({ success: false, error: 'Topic is required' }, 400)
  const expandedTopic = expandTopic(topic)
  const wordTargets: Record<string,number> = {'60sec':150,'5min':750,'10min':1500,'15min':2200}
  const words = wordTargets[duration] || 750

  try {
    const script = parseJSON(await callAI(
      `Write a complete YouTube ${duration||'5min'} script. Topic: '${expandedTopic}'. Style: ${style||'Educational'}. ~${words} words.

RULES:
- Hook NEVER starts with: hey guys, welcome back, in this video, today I
- Open with shocking stat, bold claim, or direct challenge with a specific number
- Indian context where relevant (Rs amounts, Indian cities, Indian culture)
- Each section ends with a micro-hook
- CTA asks specific comment action, not just "subscribe"
- All titles FULLY FORMED with specific numbers or results

Return JSON: {
  hook: "complete hook 30-60 words",
  intro: "complete intro 60-90 words",
  sections: [{ title: "section name", content: "full section text", duration: "Xmin", microHook: "one sentence teaser" }],
  cta: "complete CTA 30-50 words",
  endScreen: "20 second end screen script",
  titles: ["fully formed title with number/result", "different angle title", "question/fear title"],
  description: "200 word SEO description",
  hashtags: ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  thumbnailConcept: "specific thumbnail description"
}`,
      SMM_PROMPT, c.env, 2500
    ))
    return c.json({ success: true, data: script })
  } catch(err:any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// ==========================================
// POST /api/competitors — COMPETITOR ANALYSIS
// ==========================================
app.post('/api/competitors', async (c) => {
  const { channelUrls } = await c.req.json()
  if (!channelUrls?.length) return c.json({ success: false, error: 'Add at least one competitor URL' }, 400)
  const key = c.env.YOUTUBE_API_KEY
  const YT = 'https://www.googleapis.com/youtube/v3'

  const competitorSummaries: any[] = []
  for (const url of channelUrls.slice(0,5)) {
    try {
      const atMatch = url.match(/@([^/?&\s]+)/)
      const handle = atMatch ? atMatch[1] : url.split('/').pop() || ''
      const fh = await fetch(`${YT}/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${key}`).then(r=>r.json()) as any
      const chanItem = fh.items?.[0]
      if (!chanItem) continue
      const cid = chanItem.id
      const vs = await fetch(`${YT}/search?part=snippet&channelId=${cid}&order=date&maxResults=20&type=video&key=${key}`).then(r=>r.json()) as any
      const vids = await fetch(`${YT}/videos?part=snippet,statistics&id=${vs.items?.map((v:any)=>v.id?.videoId).filter(Boolean).join(',')}&key=${key}`).then(r=>r.json()) as any
      const items = vids.items || []
      const avgV = Math.floor(items.reduce((s:number,v:any)=>s+parseInt(v.statistics?.viewCount||'0'),0)/Math.max(1,items.length))
      competitorSummaries.push({
        channelId: cid,
        channelTitle: chanItem.snippet?.title||'',
        thumbnailUrl: chanItem.snippet?.thumbnails?.medium?.url||'',
        subscriberCount: parseInt(chanItem.statistics?.subscriberCount||'0'),
        avgViews: avgV,
        recentTitles: items.slice(0,5).map((v:any)=>v.snippet?.title||'')
      })
    } catch { continue }
  }

  if (!competitorSummaries.length) return c.json({ success: false, error: 'Could not fetch any competitor data' }, 400)

  try {
    const analysis = parseJSON(await callAI(
      `Analyze these competitor YouTube channels and give strategic intelligence.
${JSON.stringify(competitorSummaries)}

For each channel give a strength, weakness, title formula, and posting pattern based on their actual recent titles.
Find content gaps none of them are covering.
Return JSON: {
  competitors: [{ channelId, channelTitle, thumbnailUrl, subscriberCount, avgViews, recentTitles, strengthSummary, weaknessSummary, titleFormula, postingPattern }],
  contentGaps: ["specific topic gap 1", "specific topic gap 2", "specific topic gap 3"],
  opportunities: ["specific opportunity 1", "specific opportunity 2"],
  threatLevel: "Low or Medium or High",
  winStrategy: "specific 2-3 sentence strategy to beat these channels"
}`,
      SMM_PROMPT, c.env, 2000
    ))
    return c.json({ success: true, data: analysis })
  } catch {
    return c.json({ success: true, data: { competitors: competitorSummaries, contentGaps: ['No AI analysis available'], opportunities: [], threatLevel: 'Medium', winStrategy: 'Focus on posting more consistently than your competitors.' }})
  }
})

// ==========================================
// POST /api/trends — TRENDING TOPICS
// ==========================================
app.post('/api/trends', async (c) => {
  const { niche, country } = await c.req.json()
  const geoMap: Record<string,string> = { India:'IN', US:'US', UK:'GB', Canada:'CA', Australia:'AU', Global:'US' }
  const geo = geoMap[country||'India'] || 'IN'

  let trendTopics: string[] = []
  try {
    const r = await fetch(`https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`, { headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'} })
    const xml = await r.text()
    const matches = xml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g) || []
    trendTopics = matches.slice(1,11).map(m => m.replace(/<title><!\[CDATA\[/,'').replace(/\]\]><\/title>/,''))
  } catch {}

  const nicheFallbacks: Record<string,string[]> = {
    Education:['UPSC 2025 Results','JEE Advanced Prep','NEET PG Exam','Board Exams Strategy','IIT Admission Tips'],
    Finance:['Stock Market India Today','RBI Repo Rate Change','Mutual Fund SIP','Budget 2025 Impact','Income Tax Filing'],
    Gaming:['BGMI Season Update','Free Fire MAX Changes','Valorant India Tournament','GTA 6 Release Date','Best Gaming Phone'],
    Tech:['ChatGPT New Features','iPhone 17 Launch India','Best AI Tools 2025','Android 15 Features','Laptop Under 50000'],
    Fitness:['Weight Loss Without Gym','High Protein Indian Diet','30 Day Transformation','Yoga for Beginners','Intermittent Fasting India'],
    Motivation:['Morning Routine Successful Indians','Discipline Building Habits','Productivity System 2025','Mental Strength Training','Study Motivation'],
    General:['India News Today','IPL 2025 Live','Startup India Success','YouTube Growth Tips','Social Media Strategy']
  }

  if (trendTopics.length < 3) trendTopics = nicheFallbacks[niche||'General'] || nicheFallbacks.General

  const trends = trendTopics.map((topic, idx) => ({
    topic,
    stage: idx<4 ? 'Rising' : idx<7 ? 'Peak' : 'Early',
    window: idx<4 ? '48h window' : idx<7 ? '16h window' : '72h window',
    competition: idx<4 ? 'High' : idx<7 ? 'Medium' : 'Low',
    trendScore: Math.max(20, 100-idx*8),
    suggestedTitle: `The Truth About ${topic} That Nobody Is Talking About` 
  }))

  return c.json({ success: true, data: { trends, lastUpdated: new Date().toISOString() }})
})

// ==========================================
// GET /api/daily-brief — DAILY BRIEFING
// ==========================================
app.get('/api/daily-brief', async (c) => {
  const niche = c.req.query('niche') || 'General'
  const now = new Date()
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()]
  const hour = now.getHours()
  const greeting = hour<12 ? 'Good morning' : hour<17 ? 'Good afternoon' : 'Good evening'
  const isGoodDay = ['Tuesday','Wednesday','Thursday','Friday'].includes(dayName)

  const nicheTopics: Record<string,string[]> = {
    Education:['How I Cleared UPSC in My First Attempt','5 Study Techniques That Tripled My Retention','The JEE Preparation Mistake Every Student Makes'],
    Finance:['I Invested Rs5000 Every Month for 3 Years — The Result Shocked Me','The Tax Saving Strategy Most Salaried Indians Don\'t Know','Why Your Savings Account is Losing You Money'],
    Gaming:['I Played BGMI for 30 Days Straight — Here Is What Happened','The Settings Pro Players Use That Nobody Shares','I Challenged 100 Random Players — Here Is How It Went'],
    Tech:['The AI Tool That Replaced 4 Apps I Was Paying For','I Built a Full Website Using Only Free AI Tools in 2 Hours','The ChatGPT Prompt That Changed How I Work'],
    Fitness:['I Worked Out 20 Minutes a Day for 90 Days — My Honest Result','The High Protein Indian Meals I Cook Every Week Under Rs150','Why Most Indian Fitness Advice is Wrong for Your Body Type'],
    General:['I Tried a New Morning Routine for 30 Days — What Changed','The One Habit That Separates People Who Grow From Those Who Don\'t','I Made Every Common Mistake So You Don\'t Have To']
  }
  const topics = nicheTopics[niche] || nicheTopics.General
  const todayTopic = topics[now.getDate() % topics.length]

  return c.json({ success: true, data: {
    greeting, dayName, isGoodDay,
    dateStr: now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),
    videoForToday: { title: todayTopic, reason: isGoodDay ? 'Today is a high-traffic day — upload before 6PM IST for maximum reach' : 'Lower traffic day — use today to film and schedule for Tuesday or Wednesday' },
    thingsToKnow: [
      { title: 'Best Upload Window', body: isGoodDay ? `${dayName} is a strong day. Post between 12PM-6PM IST for the best first-hour push.` : `${dayName} is slower. Film today, post Tuesday-Thursday for better reach.` },
      { title: 'Engagement Tip', body: 'Reply to every comment within the first 2 hours of posting. This signals quality to the algorithm and boosts distribution.' },
      { title: 'Title Reminder', body: 'Before you publish — does your title have a specific number, result, or timeframe? If not, change it now.' }
    ]
  }})
})

// ==========================================
// POST /api/report — CHANNEL REPORT
// ==========================================
app.post('/api/report', async (c) => {
  const { analysisData } = await c.req.json()
  if (!analysisData) return c.json({ success: false, error: 'Analyze your channel first' }, 400)

  const { channel, metrics, healthScore, series, uploadTimeInsights, strategicInsights } = analysisData
  const context = `Channel: ${channel.title} (${channel.subscriberCount.toLocaleString()} subs, ${metrics.averageViews.toLocaleString()} avg views, ${metrics.uploadFrequencyDays}d upload freq, health ${healthScore.total}/100, best day ${uploadTimeInsights.bestDay})` 

  try {
    const report = parseJSON(await callAI(
      `${context}
Top series: ${series[0]?.name||'none'}
Insights: ${strategicInsights.slice(0,2).join(' | ')}
Generate a brutally honest weekly channel report. Use real numbers. Direct commands only.
Return JSON: { weekSummary: string, bestContentInsight: string, biggestMiss: string, priorities: [string, string, string], stopDoing: string, startDoing: string, projection: string }`,
      SMM_PROMPT, c.env, 1200
    ))
    return c.json({ success: true, data: report })
  } catch {
    return c.json({ success: true, data: {
      weekSummary: `${channel.title} is at ${healthScore.total}/100 health with ${metrics.averageViews.toLocaleString()} avg views. ${healthScore.total>=70?'Strong fundamentals.':'Needs improvement in key areas.'}`,
      bestContentInsight: strategicInsights[0] || 'Analyze your channel to get insights.',
      biggestMiss: `Upload frequency is ${metrics.uploadFrequencyDays} days. ${metrics.uploadFrequencyDays>7?'Post more consistently to improve algorithm favor.':'Good consistency — maintain this.'}`,
      priorities: ['Focus on your best performing series','Optimize upload timing to '+uploadTimeInsights.bestDay,'Improve engagement in first 30 minutes after posting'],
      stopDoing: 'Stop uploading on low-traffic days without a strategy.',
      startDoing: `Start posting every ${uploadTimeInsights.bestDay} at ${uploadTimeInsights.bestTimeBlock} UTC.`,
      projection: `At current pace: +${Math.floor(channel.subscriberCount*0.08).toLocaleString()} subs in 90 days.` 
    }})
  }
})

// ==========================================
// AUTH ROUTES WITH DYNAMIC ORIGIN
// ==========================================
app.get('/api/auth/login', async (c) => {
  const origin = new URL(c.req.url).origin
  const redirectUrl = `${origin}/auth/callback`
  // Use Mocha's UsersService for auth
  return c.json({ success: true, redirectUrl, message: 'Use this dynamic redirect URL for OAuth' })
})

export default app
